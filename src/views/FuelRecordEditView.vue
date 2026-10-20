<template>
  <div class="fuel-record-edit-container">
    <div v-if="loading" class="loading-container">
      <ProgressSpinner />
      <p>読み込み中...</p>
    </div>

    <Card v-else-if="record" class="form-card">
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
              @click="$router.push('/fuel-records')"
              text
              rounded
              class="back-button"
            />
          </div>
          <h1>給油記録の編集</h1>
        </div>
      </template>
      <template #content>
        <form @submit.prevent="handleSubmit" class="fuel-record-form">
          <div class="form-group">
            <label for="vehicle">車両 <span class="required">*</span></label>
            <Select
              id="vehicle"
              v-model="vehicleId"
              :options="vehicleOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="車両を選択してください"
              :invalid="!!vehicleIdError"
              class="input-field"
            />
            <small v-if="vehicleIdError" class="error-message">{{ vehicleIdError }}</small>
          </div>

          <div class="form-group">
            <label for="date">給油日 <span class="required">*</span></label>
            <DatePicker
              id="date"
              v-model="date"
              dateFormat="yy/mm/dd"
              :invalid="!!dateError"
              class="input-field"
              placeholder="給油日を選択"
            />
            <small v-if="dateError" class="error-message">{{ dateError }}</small>
          </div>

          <div class="form-group">
            <label for="fuelAmount">給油量 (L) <span class="required">*</span></label>
            <InputNumber
              id="fuelAmount"
              v-model="fuelAmount"
              :minFractionDigits="2"
              :maxFractionDigits="2"
              :min="0"
              placeholder="例: 40.50"
              :invalid="!!fuelAmountError"
              class="input-field"
            />
            <small v-if="fuelAmountError" class="error-message">{{ fuelAmountError }}</small>
          </div>

          <div class="form-group">
            <label for="pricePerLiter">リッター単価 (円/L) <span class="required">*</span></label>
            <InputNumber
              id="pricePerLiter"
              v-model="pricePerLiter"
              :minFractionDigits="2"
              :maxFractionDigits="2"
              :min="0"
              placeholder="例: 168.50"
              :invalid="!!pricePerLiterError"
              class="input-field"
            />
            <small v-if="pricePerLiterError" class="error-message">{{ pricePerLiterError }}</small>
          </div>

          <div class="form-group">
            <label for="odometer">走行距離 (km) <span class="required">*</span></label>
            <InputNumber
              id="odometer"
              v-model="odometer"
              :min="0"
              :useGrouping="true"
              placeholder="例: 12345"
              :invalid="!!odometerError"
              class="input-field"
            />
            <small v-if="odometerError" class="error-message">{{ odometerError }}</small>
            <small class="hint-text">オドメーターに表示されている総走行距離を入力してください</small>
          </div>

          <div v-if="totalCost !== null" class="calculation-display">
            <div class="calculation-item">
              <span class="label">給油金額:</span>
              <span class="value">{{ formatCurrency(totalCost) }}</span>
            </div>
          </div>

          <Message v-if="errorMessage" severity="error" :closable="false">
            {{ errorMessage }}
          </Message>

          <div class="button-group">
            <Button
              label="キャンセル"
              @click="$router.push('/fuel-records')"
              severity="secondary"
              outlined
              size="large"
            />
            <Button
              type="submit"
              label="更新する"
              :loading="fuelRecordStore.loading"
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
          <h2>給油記録が見つかりません</h2>
          <p>指定された給油記録は存在しないか、削除された可能性があります。</p>
          <Button
            label="給油記録一覧に戻る"
            icon="pi pi-arrow-left"
            @click="$router.push('/fuel-records')"
            size="large"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFuelRecordStore } from '@/stores/fuelRecord'
import { useVehicleStore } from '@/stores/vehicle'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const route = useRoute()
const fuelRecordStore = useFuelRecordStore()
const vehicleStore = useVehicleStore()
const toast = useToast()

const loading = ref(true)
const vehicleId = ref<string>('')
const date = ref<Date>(new Date())
const fuelAmount = ref<number | null>(null)
const pricePerLiter = ref<number | null>(null)
const odometer = ref<number | null>(null)

const vehicleIdError = ref('')
const dateError = ref('')
const fuelAmountError = ref('')
const pricePerLiterError = ref('')
const odometerError = ref('')
const errorMessage = ref('')

const recordId = computed(() => route.params.id as string)
const record = computed(() => fuelRecordStore.records.find((r) => r.id === recordId.value))

const vehicleOptions = computed(() => {
  return vehicleStore.vehicles.map((v) => ({
    label: `${v.name} (${v.license_plate})`,
    value: v.id,
  }))
})

const totalCost = computed(() => {
  if (fuelAmount.value !== null && pricePerLiter.value !== null) {
    return fuelAmount.value * pricePerLiter.value
  }
  return null
})

onMounted(async () => {
  try {
    // 車両リストを取得
    if (vehicleStore.vehicles.length === 0) {
      await vehicleStore.fetchVehicles()
    }

    // 給油記録リストが空の場合は取得
    if (fuelRecordStore.records.length === 0) {
      await fuelRecordStore.fetchRecords()
    }

    // 給油記録情報をフォームに設定
    if (record.value) {
      vehicleId.value = record.value.vehicle_id
      date.value = new Date(record.value.date)
      fuelAmount.value = record.value.fuel_amount
      pricePerLiter.value = record.value.price_per_liter
      odometer.value = record.value.odometer
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: 'データの取得に失敗しました',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
})

const validateForm = () => {
  vehicleIdError.value = ''
  dateError.value = ''
  fuelAmountError.value = ''
  pricePerLiterError.value = ''
  odometerError.value = ''
  errorMessage.value = ''

  let isValid = true

  if (!vehicleId.value) {
    vehicleIdError.value = '車両を選択してください'
    isValid = false
  }

  if (!date.value) {
    dateError.value = '給油日を選択してください'
    isValid = false
  }

  if (fuelAmount.value === null || fuelAmount.value <= 0) {
    fuelAmountError.value = '給油量を入力してください（0より大きい値）'
    isValid = false
  }

  if (pricePerLiter.value === null || pricePerLiter.value <= 0) {
    pricePerLiterError.value = 'リッター単価を入力してください（0より大きい値）'
    isValid = false
  }

  if (odometer.value === null || odometer.value < 0) {
    odometerError.value = '走行距離を入力してください（0以上の値）'
    isValid = false
  }

  return isValid
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(value)
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  // Type narrowing: ensure vehicleId is string
  const currentVehicleId = vehicleId.value
  if (!currentVehicleId) {
    errorMessage.value = '車両を選択してください'
    return
  }

  // Type narrowing: ensure date is Date
  const currentDate = date.value
  if (!currentDate) {
    errorMessage.value = '給油日を選択してください'
    return
  }

  try {
    // ローカルタイムゾーンでYYYY-MM-DD形式の文字列を作成
    // toISOString()はUTCに変換されるため、タイムゾーンによって日付がずれる問題を回避
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`

    await fuelRecordStore.updateRecord(
      recordId.value,
      currentVehicleId,
      dateString,
      fuelAmount.value!,
      pricePerLiter.value!,
      odometer.value!,
    )

    toast.add({
      severity: 'success',
      summary: '成功',
      detail: '給油記録を更新しました',
      life: 3000,
    })
    router.push('/fuel-records')
  } catch (error: any) {
    console.error('Error updating fuel record:', error)
    errorMessage.value = '給油記録の更新に失敗しました。もう一度お試しください。'
  }
}
</script>

<style scoped>
.fuel-record-edit-container {
  padding: 2rem;
  max-width: 700px;
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

.fuel-record-form {
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
}

.input-field :deep(input) {
  font-size: 1.1rem;
  padding: 0.75rem;
}

.hint-text {
  color: #666;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.error-message {
  color: #e74c3c;
  font-size: 0.95rem;
  margin-top: 0.25rem;
}

.calculation-display {
  background: #f0f7ff;
  border: 2px solid #667eea;
  border-radius: 8px;
  padding: 1.5rem;
}

.calculation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.calculation-item .label {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.calculation-item .value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #667eea;
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
  .fuel-record-edit-container {
    max-width: 800px;
  }
}

/* タブレット画面（768px〜1199px） */
@media (min-width: 768px) and (max-width: 1199px) {
  .fuel-record-edit-container {
    max-width: 900px;
  }
}

/* スマホ画面（768px未満） */
@media (max-width: 767px) {
  .fuel-record-edit-container {
    padding: 1rem;
  }

  .form-header h1 {
    font-size: 1.5rem;
  }

  .button-group {
    flex-direction: column-reverse;
  }

  .calculation-item .label {
    font-size: 1.1rem;
  }

  .calculation-item .value {
    font-size: 1.5rem;
  }
}
</style>
