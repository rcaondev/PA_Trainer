use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

// Os pokémons cadastrados ficam em um JSON na pasta de dados do app
// (%APPDATA%\com.patrainer.app\team.json no Windows).
fn team_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("team.json"))
}

#[tauri::command]
fn load_team(app: AppHandle) -> Result<String, String> {
    let path = team_path(&app)?;
    if !path.exists() {
        return Ok("[]".into());
    }
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_team(app: AppHandle, data: String) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(&data).map_err(|e| format!("JSON inválido: {e}"))?;
    let path = team_path(&app)?;
    // grava em arquivo temporário e renomeia, para nunca deixar o time pela metade
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, data).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_team, save_team])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o PA Trainer");
}
