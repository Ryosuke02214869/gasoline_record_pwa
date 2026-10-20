<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h1>ガソリン給油記録アプリ</h1>
        <h2>新規登録</h2>
      </div>

      <form @submit.prevent="handleRegister" class="register-form">
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
            toggleMask
            placeholder="6文字以上のパスワード"
            :invalid="!!passwordError"
            class="input-field"
          >
            <template #header>
              <h6>パスワードを入力してください</h6>
            </template>
            <template #footer>
              <p class="password-hint">推奨: 8文字以上、大文字小文字と数字を含む</p>
            </template>
          </Password>
          <small v-if="passwordError" class="error-message">{{ passwordError }}</small>
        </div>

        <div class="form-group">
          <label for="confirmPassword">パスワード（確認）</label>
          <Password
            id="confirmPassword"
            v-model="confirmPassword"
            :feedback="false"
            toggleMask
            placeholder="パスワードを再入力"
            :invalid="!!confirmPasswordError"
            class="input-field"
          />
          <small v-if="confirmPasswordError" class="error-message">{{
            confirmPasswordError
          }}</small>
        </div>

        <Message v-if="errorMessage" severity="error" :closable="false">
          {{ errorMessage }}
        </Message>

        <Message v-if="successMessage" severity="success" :closable="false">
          {{ successMessage }}
        </Message>

        <Button
          type="submit"
          label="登録する"
          :loading="loading"
          class="register-button"
          size="large"
        />

        <div class="login-link">
          <p>すでにアカウントをお持ちの方</p>
          <Button label="ログインはこちら" link @click="$router.push('/login')" class="login-button-link" />
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
const confirmPassword = ref('')
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const loading = ref(false)

const validateForm = () => {
  emailError.value = ''
  passwordError.value = ''
  confirmPasswordError.value = ''
  errorMessage.value = ''
  successMessage.value = ''

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

  if (!confirmPassword.value) {
    confirmPasswordError.value = 'パスワード（確認）を入力してください'
    isValid = false
  } else if (password.value !== confirmPassword.value) {
    confirmPasswordError.value = 'パスワードが一致しません'
    isValid = false
  }

  return isValid
}

const handleRegister = async () => {
  if (!validateForm()) {
    return
  }

  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await authStore.signUp(email.value, password.value)
    successMessage.value = '登録が完了しました！ログイン画面に移動します...'

    // 2秒後にログイン画面へ遷移
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (error: any) {
    console.error('Registration error:', error)
    if (error.message.includes('User already registered')) {
      errorMessage.value = 'このメールアドレスは既に登録されています'
    } else if (error.message.includes('Password should be at least 6 characters')) {
      errorMessage.value = 'パスワードは6文字以上で設定してください'
    } else {
      errorMessage.value = '登録に失敗しました。もう一度お試しください。'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.register-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 2.5rem;
  width: 100%;
  max-width: 450px;
}

.register-header {
  text-align: center;
  margin-bottom: 2rem;
}

.register-header h1 {
  color: #667eea;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.register-header h2 {
  color: #333;
  font-size: 1.8rem;
  margin: 0;
  font-weight: 700;
}

.register-form {
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
  padding: 0.75rem;
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
  padding-right: 3rem;
}

/* toggleMaskアイコンの位置調整 */
.form-group :deep(.p-password .p-password-toggle-icon) {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
}

.form-group :deep(.p-password button.p-password-toggle) {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  margin: 0;
}

.password-hint {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.error-message {
  color: #e74c3c;
  font-size: 0.95rem;
  margin-top: 0.25rem;
}

.register-button {
  width: 100%;
  font-size: 1.2rem;
  padding: 1rem;
  margin-top: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.register-button:hover {
  background: linear-gradient(135deg, #5568d3 0%, #63408b 100%);
}

.login-link {
  text-align: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.login-link p {
  color: #666;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.login-button-link {
  font-size: 1.1rem;
  color: #667eea;
  font-weight: 600;
}

/* レスポンシブ対応 */
@media (max-width: 480px) {
  .register-card {
    padding: 2rem 1.5rem;
  }

  .register-header h1 {
    font-size: 1.3rem;
  }

  .register-header h2 {
    font-size: 1.5rem;
  }
}
</style>
