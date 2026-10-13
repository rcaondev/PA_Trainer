import { createApp } from 'vue'
import 'leaflet/dist/leaflet.css'
import './style.css'
import App from './App.vue'
import { init } from './lib/store'

createApp(App).mount('#app')
init()
