<template>
  <div class="vehicle-list-container">
    <div class="page-header">
      <div class="header-left">
        <Button
          icon="pi pi-home"
          label="ホーム"
          @click="$router.push('/')"
          severity="secondary"
          outlined
        />
        <h1>車両管理</h1>
      </div>
      <Button
        label="新しい車両を登録"
        icon="pi pi-plus"
        :disabled="syncStore.isOffline"
        @click="$router.push('/vehicles/create')"
        size="large"
      />
    </div>

    <Message v-if="syncStore.isOffline" severity="warn" :closable="false" class="offline-message">
      オフライン中は車両の登録・編集・削除はできません。インターネットに接続してから操作してください。
    </Message>

    <div v-if="vehicleStore.loading" class="loading-container">
      <ProgressSpinner />
      <p>読み込み中...</p>
    </div>

    <div v-else-if="vehicleStore.vehicles.length === 0" class="empty-state">
      <Card>
        <template #content>
          <div class="empty-content">
            <i class="pi pi-car" style="font-size: 4rem; color: #999"></i>
            <h2>登録されている車両がありません</h2>
            <p>「新しい車両を登録」ボタンから車両を登録してください</p>
            <Button
              label="車両を登録する"
              icon="pi pi-plus"
              :disabled="syncStore.isOffline"
              @click="$router.push('/vehicles/create')"
              size="large"
              class="mt-3"
            />
          </div>
        </template>
      </Card>
    </div>

    <div v-else class="vehicle-grid">
      <Card v-for="vehicle in vehicleStore.vehicles" :key="vehicle.id" class="vehicle-card">
        <template #header>
          <div class="card-header">
            <i class="pi pi-car"></i>
          </div>
        </template>
        <template #title>{{ vehicle.name }}</template>
        <template #subtitle>
          <div class="vehicle-info">
            <span class="license-plate">{{ vehicle.license_plate }}</span>
          </div>
        </template>
        <template #content>
          <div class="vehicle-meta">
            <small>登録日: {{ formatDate(vehicle.created_at) }}</small>
          </div>
        </template>
        <template #footer>
          <div class="card-actions">
            <Button
              label="編集"
              icon="pi pi-pencil"
              :disabled="syncStore.isOffline"
              @click="$router.push(`/vehicles/${vehicle.id}/edit`)"
              severity="info"
              outlined
            />
            <Button
              label="削除"
              icon="pi pi-trash"
              :disabled="syncStore.isOffline"
              @click="confirmDelete(vehicle)"
              severity="danger"
              outlined
            />
          </div>
        </template>
      </Card>
    </div>

    <!-- 削除確認ダイアログ -->
    <Dialog
      v-model:visible="deleteDialogVisible"
      header="車両の削除"
      :modal="true"
      :closable="true"
      :style="{ width: '90vw', maxWidth: '500px' }"
    >
      <div class="dialog-content">
        <p>以下の車両を削除してもよろしいですか？</p>
        <div v-if="vehicleToDelete" class="delete-info">
          <strong>{{ vehicleToDelete.name }}</strong>
          <br />
          <span>{{ vehicleToDelete.license_plate }}</span>
        </div>
        <Message severity="warn" :closable="false" class="mt-3">
          この車両に関連する給油記録も全て削除されます。この操作は取り消せません。
        </Message>
      </div>
      <template #footer>
        <Button label="キャンセル" @click="deleteDialogVisible = false" severity="secondary" />
        <Button
          label="削除する"
          @click="handleDelete"
          severity="danger"
          :loading="vehicleStore.loading"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVehicleStore, type Vehicle } from '@/stores/vehicle'
import { useSyncStore } from '@/stores/sync'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const vehicleStore = useVehicleStore()
const syncStore = useSyncStore()
const toast = useToast()

const deleteDialogVisible = ref(false)
const vehicleToDelete = ref<Vehicle | null>(null)

onMounted(async () => {
  try {
    await vehicleStore.fetchVehicles()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: '車両の取得に失敗しました',
      life: 3000,
    })
  }
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const confirmDelete = (vehicle: Vehicle) => {
  vehicleToDelete.value = vehicle
  deleteDialogVisible.value = true
}

const handleDelete = async () => {
  if (!vehicleToDelete.value) return

  try {
    await vehicleStore.deleteVehicle(vehicleToDelete.value.id)
    toast.add({
      severity: 'success',
      summary: '成功',
      detail: '車両を削除しました',
      life: 3000,
    })
    deleteDialogVisible.value = false
    vehicleToDelete.value = null
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: '車両の削除に失敗しました',
      life: 3000,
    })
  }
}
</script>

<style scoped>
.vehicle-list-container {
  min-height: 100vh;
  background: var(--vt-c-bg-lavender);
  padding: 1.5rem;
}

.offline-message {
  max-width: 600px;
  margin: 0 auto 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vt-c-text-primary);
  margin: 0;
}

.page-header :deep(.p-button) {
  background: var(--vt-c-primary);
  border: none;
  border-radius: 12px;
  padding: 0.625rem 1.25rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(91, 95, 237, 0.2);
}

.page-header :deep(.p-button:hover) {
  background: var(--vt-c-primary-dark);
  box-shadow: 0 4px 12px rgba(91, 95, 237, 0.3);
}

.header-left :deep(.p-button) {
  background: var(--vt-c-primary);
  border: none;
  color: #FFFFFF;
  border-radius: 12px;
  padding: 0.625rem 1.25rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(91, 95, 237, 0.2);
}

.header-left :deep(.p-button:hover) {
  background: var(--vt-c-primary-dark);
  box-shadow: 0 4px 12px rgba(91, 95, 237, 0.3);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 0;
  gap: 1rem;
}

.empty-state {
  max-width: 400px;
  margin: 2rem auto;
}

.empty-state :deep(.p-card) {
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem 2rem;
}

.empty-content i {
  color: var(--vt-c-text-tertiary);
}

.empty-content h2 {
  margin: 1rem 0 0.5rem;
  color: var(--vt-c-text-primary);
  font-size: 1.125rem;
  font-weight: 600;
}

.empty-content p {
  color: var(--vt-c-text-secondary);
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

.empty-content :deep(.p-button) {
  background: var(--vt-c-primary);
  border: none;
  border-radius: 12px;
  padding: 0.625rem 1.25rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(91, 95, 237, 0.2);
}

.vehicle-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  max-width: 400px;
  margin: 0 auto;
}

.vehicle-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.vehicle-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.card-header {
  background: var(--vt-c-bg-blue-light);
  color: var(--vt-c-primary);
  padding: 2rem;
  text-align: center;
  font-size: 3rem;
  border-radius: 20px 20px 0 0;
}

.vehicle-card :deep(.p-card-title) {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--vt-c-text-primary);
}

.vehicle-info {
  margin-top: 0.5rem;
}

.license-plate {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vt-c-primary);
  font-family: monospace;
}

.vehicle-meta {
  color: var(--vt-c-text-tertiary);
  font-size: 0.75rem;
}

.card-actions {
  display: flex;
  gap: 0.75rem;
}

.card-actions button {
  flex: 1;
  border-radius: 8px;
}

.dialog-content {
  padding: 1rem 0;
}

.dialog-content p {
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.delete-info {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  font-size: 1.1rem;
}

/* PC画面（768px以上） */
@media (min-width: 768px) {
  .vehicle-list-container {
    padding: 2rem;
  }

  .vehicle-grid {
    grid-template-columns: repeat(2, 1fr);
    max-width: 800px;
  }

  .empty-state {
    max-width: 500px;
  }
}

/* PC画面（1024px以上） */
@media (min-width: 1024px) {
  .vehicle-grid {
    grid-template-columns: repeat(3, 1fr);
    max-width: 1200px;
  }
}

/* スマホ画面（768px未満） */
@media (max-width: 767px) {
  .vehicle-list-container {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .header-left {
    flex-direction: row;
    align-items: center;
  }

  .page-header h1 {
    font-size: 1.125rem;
  }

  .vehicle-grid {
    max-width: 100%;
  }

  .card-actions {
    flex-direction: column;
  }

  .card-actions button {
    width: 100%;
  }
}
</style>
