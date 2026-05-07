<template>
  <div class="login-container">
    <div class="login-box">
      <h1 class="login-title">族谱系统</h1>

      <!-- 未设置密码状态 -->
      <div v-if="!passwordSet" class="setup-section">
        <div class="setup-text">
          <p class="setup-desc">系统尚未设置管理员密码，请先设置密码以访问系统。</p>
        </div>
        <div class="setup-form">
          <div class="form-group">
            <label for="setupPassword">设置管理员密码</label>
            <input
              type="password"
              id="setupPassword"
              v-model="setupPassword"
              @keyup.enter="handleSetup"
              placeholder="请输入密码"
              ref="setupPasswordInput"
            />
          </div>
          <div class="form-group">
            <label for="confirmPassword">确认密码</label>
            <input
              type="password"
              id="confirmPassword"
              v-model="confirmPassword"
              @keyup.enter="handleSetup"
              placeholder="请再次输入密码"
            />
          </div>
          <button class="setup-btn" @click="handleSetup">设置密码</button>
        </div>
      </div>

      <!-- 已设置密码状态 -->
      <div v-else class="login-form">
          <div class="login-top-flex-Container">
              <label for="password">访问密码</label>
              <a class="change-password-link" @click="handleChangePassword">修改密码</a>
          </div>
          <div class="form-group">
              <input type="password"
                     id="password"
                     v-model="password"
                     @keyup.enter="handleLogin"
                     placeholder="请输入密码"
                     ref="passwordInput" />
              <button class="login-btn" @click="handleLogin">登录</button>

              <button class="test-clear-btn" @click="handleClearAllData">测试：清除所有数据</button>
          </div>
        
      </div>

      <!-- 修改密码弹窗 -->
      <div v-if="showChangePasswordDialog" class="modal-overlay" @click="handleCloseChangePasswordDialog">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>修改密码</h3>
            <button class="close-btn" @click="handleCloseChangePasswordDialog">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="oldPassword">旧密码</label>
              <input
                type="password"
                id="oldPassword"
                v-model="oldPassword"
                placeholder="请输入旧密码"
              />
            </div>
            <div class="form-group">
              <label for="newPassword">新密码</label>
              <input
                type="password"
                id="newPassword"
                v-model="newPassword"
                placeholder="请输入新密码"
              />
            </div>
            <div class="form-group">
              <label for="confirmNewPassword">确认新密码</label>
              <input
                type="password"
                id="confirmNewPassword"
                v-model="confirmNewPassword"
                placeholder="请再次输入新密码"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="handleCloseChangePasswordDialog">取消</button>
            <button class="confirm-btn" @click="handleConfirmChangePassword">确认修改</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { familyTreeManager } from '../classes/FamilyTreeManager.js'

const authStore = useAuthStore()
const password = ref('')
const setupPassword = ref('')
const confirmPassword = ref('')
const passwordInput = ref(null)
const setupPasswordInput = ref(null)

// 检查是否已设置密码
const checkPasswordSet = async () => {
  try {
    const set = await authStore.checkPasswordSet()
    return set
  } catch (error) {
    console.error('检查密码设置状态失败:', error)
    return false
  }
}

// 处理密码设置
const handleSetup = async () => {
  if (!setupPassword.value) {
    alert("请输入密码")
    return
  }

  if (setupPassword.value !== confirmPassword.value) {
    alert('两次输入的密码不一致')
    return
  }

  if (setupPassword.value.length < 6) {
    alert('密码长度至少为6位')
    return
  }

  const result = await authStore.setupAdminPassword(setupPassword.value)
  if (result.success) {
    alert('密码设置成功！')
    passwordSet.value = true
    setupPassword.value = ''
    confirmPassword.value = ''
    passwordInput.value?.focus()
  } else {
    alert('密码设置失败: ' + result.message)
  }
}

// 处理登录
const handleLogin = async () => {
  if (!password.value) {
    alert('请输入密码')
    return
  }

  const result = await authStore.login(password.value)
  if (result.success) {
    emit('login', password.value)
  } else {
    alert(result.message)
  }
}

// 修改密码
const showChangePasswordDialog = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')

const handleChangePassword = () => {
  oldPassword.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  showChangePasswordDialog.value = true
}

const handleConfirmChangePassword = async () => {
  if (!oldPassword.value) {
    alert('请输入旧密码')
    return
  }
  if (!newPassword.value) {
    alert('请输入新密码')
    return
  }
  if (newPassword.value !== confirmNewPassword.value) {
    alert('两次输入的新密码不一致')
    return
  }
  if (newPassword.value === oldPassword.value) {
    alert('新密码不能与旧密码相同')
    return
  }

  const result = await authStore.changePassword(oldPassword.value, newPassword.value)
  if (result.success) {
    alert('密码修改成功！请重新登录')
    showChangePasswordDialog.value = false
    oldPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
    password.value = ''
  } else {
    alert('密码修改失败: ' + result.message)
  }
}

// 测试：清除所有数据
const handleClearAllData = async () => {
  if (!confirm('确定要清除所有数据吗？此操作不可恢复！包括：族谱节点数据、管理员密码。')) {
    return
  }

  try {
    // 1. 清除管理员密码
    const passwordResult = await familyTreeManager.clearAllData()
    if (!passwordResult.success) {
      alert('清除数据失败: ' + passwordResult.message)
      return
    }

    // 2. 重置密码状态
    passwordSet.value = false

    alert('所有数据已清除！\n管理员密码已重置，请重新设置密码。')
  } catch (error) {
    console.error('清除数据失败:', error)
    alert('清除数据失败: ' + error.message)
  }
}

const handleCloseChangePasswordDialog = () => {
  showChangePasswordDialog.value = false
  oldPassword.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
}

const emit = defineEmits(['login'])

const passwordSet = ref(false)

onMounted(async () => {
  // 检查是否已设置密码
  passwordSet.value = await checkPasswordSet()

  // 如果未设置密码，聚焦到密码输入框
  if (!passwordSet.value) {
    setupPasswordInput.value?.focus()
  } else {
    passwordInput.value?.focus()
  }
})
</script>

<style scoped>
.login-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
}

.login-box {
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 450px;
}

.login-title {
  text-align: center;
  color: #1e3a8a;
  margin-bottom: 30px;
  font-size: 28px;
  font-weight: bold;
}

.setup-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setup-text {
  text-align: center;
}

.setup-desc {
  color: #4b5563;
  font-size: 14px;
  line-height: 1.6;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-top-flex-Container{
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:10px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #4a5568;
}

.form-group input {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #718096;
  box-shadow: 0 0 0 3px rgba(113, 128, 150, 0.2);
}

.setup-btn,
.login-btn {
  padding: 14px;
  background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.setup-btn:hover,
.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.setup-btn:active,
.login-btn:active {
  transform: translateY(0);
}

.test-clear-btn {
  padding: 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.test-clear-btn:hover {
  background: #dc2626;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
}

.test-clear-btn:active {
  transform: translateY(0);
}

/* 修改密码链接 */
.change-password-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.change-password-link:hover {
  color: #1e3a8a;
  text-decoration: underline;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2d3748;
  font-weight: 600;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn,
.confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn {
  background: #e2e8f0;
  color: #4a5568;
}

.cancel-btn:hover {
  background: #cbd5e0;
}

.confirm-btn {
  background: #718096;
}

.confirm-btn:hover {
  background: #5a6574;
}
</style>
