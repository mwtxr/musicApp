// main.js
import { createSSRApp } from 'vue'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  return {
    app,
    uni: uni // 注入 uni 到 Vue
  }
}
