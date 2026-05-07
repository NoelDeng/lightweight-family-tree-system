<template>
  <div id="app">
    <Login v-if="!isLoggedIn" @login="handleLogin" />
    <Main v-else @logout="handleLogout" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from './stores/auth.js'
import Login from './components/Login.vue'
import Main from './components/Main.vue'

const authStore = useAuthStore()
const isLoggedIn = ref(false)
const loading = ref(true)

const handleLogin = async (password) => {
  const result = await authStore.login(password)
  if (result.success) {
    isLoggedIn.value = true
  } else {
    alert(result.message)
  }
}

const handleLogout = () => {
  isLoggedIn.value = false
}

onMounted(async () => {
  loading.value = true

  try {
    // 调用authStore的initAuth初始化逻辑
    await authStore.initAuth()
  } catch (error) {
    console.error('初始化失败:', error)
    isLoggedIn.value = false
  } finally {
    loading.value = false
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  width: 100vw;
  height: 100vh;
}
</style>
