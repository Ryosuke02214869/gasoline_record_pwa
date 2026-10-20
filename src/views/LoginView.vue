<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>ガソリン給油記録アプリ</h1>
        <h2>ログイン</h2>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <InputText
            id="email"
            v-model="email"
            type="email"
            placeholder="example@email.com"
            :invalid="!!emailError"
            class="input-field"
            autofocus
          />
          <small v-if="emailError" class="error-message">{{ emailError }}</small>
        </div>

        <div class="form-group">
          <label for="password">パスワード</label>
          <Password
            id="password"
            v-model="password"
            :feedback="false"
            toggleMask
            placeholder="パスワードを入力"
            :invalid="!!passwordError"
            class="input-field"
          />
          <small v-if="passwordError" class="error-message">{{ passwordError }}</small>
        </div>

        <Message v-if="errorMessage" severity="error" :closable="false">
          {{ errorMessage }}
        </Message>

        <Button
          type="submit"
          label="ログイン"
          :loading="loading"
          class="login-button"
          size="large"
        />

        <div class="register-link">
          <p>アカウントをお持ちでない方</p>
          <Button
            label="新規登録はこちら"
            link
            @click="$router.push('/register')"
            class="register-button"
          />
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const errorMessage = ref('')
const loading = ref(false)

const validateForm = () => {
  emailError.value = ''
  passwordError.value = ''
  errorMessage.value = ''

  let isValid = true

  if (!email.value) {
    emailError.value = 'メールアドレスを入力してください'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = '正しいメールアドレスを入力してください'
    isValid = false
  }

  if (!password.value) {
    passwordError.value = 'パスワードを入力してください'
    isValid = false
  } else if (password.value.length < 6) {
    passwordError.value = 'パスワードは6文字以上で入力してください'
    isValid = false
  }

  return isValid
}

const handleLogin = async () => {
  if (!validateForm()) {
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await authStore.signIn(email.value, password.value)
    router.push('/')
  } catch (error: any) {
    console.error('Login error:', error)
    if (error.message.includes('Invalid login credentials')) {
      errorMessage.value = 'メールアドレスまたはパスワードが正しくありません'
    } else {
      errorMessage.value = 'ログインに失敗しました。もう一度お試しください。'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.login-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 2.5rem;
  width: 100%;
  max-width: 450px;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-header h1 {
  color: #667eea;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.login-header h2 {
  color: #333;
  font-size: 1.8rem;
  margin: 0;
  font-weight: 700;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 1.1rem;
}

.input-field {
  width: 100%;
  font-size: 1.1rem;
  /* padding: 0.75rem; */
}

/* PrimeVue Password component wrapper */
.form-group :deep(.p-password) {
  width: 100%;
  position: relative;
}

.form-group :deep(.p-password input) {
  width: 100%;
  font-size: 1.1rem;
  padding: 0.75rem;
  padding-right: 2rem;
}

/* toggleMaskアイコンの位置調整 */
.form-group :deep(.p-password-toggle-mask-icon) {
  top: 37%;
}

.error-message {
  color: #e74c3c;
  font-size: 0.95rem;
  margin-top: 0.25rem;
}

.login-button {
  width: 100%;
  font-size: 1.2rem;
  padding: 1rem;
  margin-top: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.login-button:hover {
  background: linear-gradient(135deg, #5568d3 0%, #63408b 100%);
}

.register-link {
  text-align: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.register-link p {
  color: #666;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.register-button {
  font-size: 1.1rem;
  color: #667eea;
  font-weight: 600;
}

/* レスポンシブ対応 */
@media (max-width: 480px) {
  .login-card {
    padding: 2rem 1.5rem;
  }

  .login-header h1 {
    font-size: 1.3rem;
  }

  .login-header h2 {
    font-size: 1.5rem;
  }
}
</style>
