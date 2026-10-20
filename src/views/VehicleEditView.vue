<template>
  <div class="vehicle-edit-container">
    <div v-if="loading" class="loading-container">
      <ProgressSpinner />
      <p>読み込み中...</p>
    </div>

    <Card v-else-if="vehicle" class="form-card">
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
          <h1>車両の編集</h1>
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
              label="更新する"
              :loading="vehicleStore.loading"
              size="large"
            />
          </div>
        </form>
      </template>
    </Card>

    <Card v-else class="error-card">
      <template #content>
        <div class="error-content">
          <i class="pi pi-exclamation-triangle" style="font-size: 3rem; color: #e74c3c"></i>
          <h2>車両が見つかりません</h2>
          <p>指定された車両は存在しないか、削除された可能性があります。</p>
          <Button
            label="車両一覧に戻る"
            icon="pi pi-arrow-left"
            @click="$router.push('/vehicles')"
            size="large"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useVehicleStore } from '@/stores/vehicle'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const route = useRoute()
const vehicleStore = useVehicleStore()
const toast = useToast()

const loading = ref(true)
const name = ref('')
const model = ref('')
const licensePlate = ref('')
const nameError = ref('')
const licensePlateError = ref('')
const errorMessage = ref('')

const vehicleId = computed(() => route.params.id as string)
const vehicle = computed(() => vehicleStore.vehicles.find((v) => v.id === vehicleId.value))

onMounted(async () => {
  try {
    // 車両リストが空の場合は取得
    if (vehicleStore.vehicles.length === 0) {
      await vehicleStore.fetchVehicles()
    }

    // 車両情報をフォームに設定
    if (vehicle.value) {
      name.value = vehicle.value.name
      model.value = vehicle.value.model || ''
      licensePlate.value = vehicle.value.license_plate
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: '車両の取得に失敗しました',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
})

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
    await vehicleStore.updateVehicle(
      vehicleId.value,
      name.value.trim(),
      licensePlate.value.trim(),
      model.value.trim() || undefined,
    )
    toast.add({
      severity: 'success',
      summary: '成功',
      detail: '車両を更新しました',
      life: 3000,
    })
    router.push('/vehicles')
  } catch (error: any) {
    console.error('Error updating vehicle:', error)
    errorMessage.value = '車両の更新に失敗しました。もう一度お試しください。'
  }
}
</script>

<style scoped>
.vehicle-edit-container {
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 0;
  gap: 1rem;
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

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem 2rem;
}

.error-content h2 {
  margin: 1rem 0 0.5rem;
  color: #666;
  font-size: 1.5rem;
}

.error-content p {
  color: #999;
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
}

/* PC画面（1200px以上） */
@media (min-width: 1200px) {
  .vehicle-edit-container {
    max-width: 800px;
  }
}

/* タブレット画面（768px〜1199px） */
@media (min-width: 768px) and (max-width: 1199px) {
  .vehicle-edit-container {
    max-width: 900px;
  }
}

/* スマホ画面（768px未満） */
@media (max-width: 767px) {
  .vehicle-edit-container {
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
