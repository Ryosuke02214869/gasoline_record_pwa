<template>
  <div class="vehicle-create-container">
    <Card class="form-card">
      <template #title>
        <div class="form-header">
          <div class="header-buttons">
            <Button
              icon="pi pi-home"
              @click="$router.push('/')"
              text
              rounded
              severity="secondary"
              class="home-button"
            />
            <Button
              icon="pi pi-arrow-left"
              @click="$router.push('/vehicles')"
              text
              rounded
              class="back-button"
            />
          </div>
          <h1>車両の登録</h1>
        </div>
      </template>
      <template #content>
        <form @submit.prevent="handleSubmit" class="vehicle-form">
          <div class="form-group">
            <label for="name">車名 <span class="required">*</span></label>
            <InputText
              id="name"
              v-model="name"
              placeholder="例: マイカー"
              :invalid="!!nameError"
              class="input-field"
              autofocus
            />
            <small class="help-text">車両の愛称やニックネームを入力</small>
            <small v-if="nameError" class="error-message">{{ nameError }}</small>
          </div>

          <div class="form-group">
            <label for="model">車種・モデル名</label>
            <InputText
              id="model"
              v-model="model"
              placeholder="例: プリウス、フィット、アクア"
              class="input-field"
            />
            <small class="help-text">車両のモデル名（任意）</small>
          </div>

          <div class="form-group">
            <label for="licensePlate">ナンバー <span class="required">*</span></label>
            <InputText
              id="licensePlate"
              v-model="licensePlate"
              placeholder="例: 品川 500 あ 12-34"
              :invalid="!!licensePlateError"
              class="input-field"
            />
            <small v-if="licensePlateError" class="error-message">{{ licensePlateError }}</small>
          </div>

          <Message v-if="errorMessage" severity="error" :closable="false">
            {{ errorMessage }}
          </Message>

          <div class="button-group">
            <Button
              label="キャンセル"
              @click="$router.push('/vehicles')"
              severity="secondary"
              outlined
              size="large"
            />
            <Button
              type="submit"
              label="登録する"
              :loading="vehicleStore.loading"
              size="large"
            />
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useVehicleStore } from '@/stores/vehicle'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const vehicleStore = useVehicleStore()
const toast = useToast()

const name = ref('')
const model = ref('')
const licensePlate = ref('')
const nameError = ref('')
const licensePlateError = ref('')
const errorMessage = ref('')

const validateForm = () => {
  nameError.value = ''
  licensePlateError.value = ''
  errorMessage.value = ''

  let isValid = true

  if (!name.value.trim()) {
    nameError.value = '車名を入力してください'
    isValid = false
  }

  if (!licensePlate.value.trim()) {
    licensePlateError.value = 'ナンバーを入力してください'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  try {
    await vehicleStore.createVehicle(
      name.value.trim(),
      licensePlate.value.trim(),
      model.value.trim() || undefined,
    )
    toast.add({
      severity: 'success',
      summary: '成功',
      detail: '車両を登録しました',
      life: 3000,
    })
    router.push('/vehicles')
  } catch (error: any) {
    console.error('Error creating vehicle:', error)
    errorMessage.value = '車両の登録に失敗しました。もう一度お試しください。'
  }
}
</script>

<style scoped>
.vehicle-create-container {
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.form-card {
  font-size: 1.1rem;
}

.form-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-buttons {
  display: flex;
  gap: 0.5rem;
}

.home-button,
.back-button {
  font-size: 1.5rem;
}

.form-header h1 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.vehicle-form {
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

.required {
  color: #e74c3c;
}

.input-field {
  width: 100%;
  font-size: 1.1rem;
  padding: 0.75rem;
}

.help-text {
  color: #7f8c8d;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.error-message {
  color: #e74c3c;
  font-size: 0.95rem;
  margin-top: 0.25rem;
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.button-group button {
  flex: 1;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .vehicle-create-container {
    padding: 1rem;
  }

  .form-header h1 {
    font-size: 1.5rem;
  }

  .button-group {
    flex-direction: column-reverse;
  }
}
</style>
