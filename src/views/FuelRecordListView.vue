<template>
  <div class="fuel-record-list-container">
    <div class="page-header">
      <div class="header-left">
        <Button
          icon="pi pi-home"
          label="ホーム"
          @click="$router.push('/')"
          severity="secondary"
          outlined
        />
        <h1>給油記録</h1>
        <SyncStatus class="sync-status-slot" />
      </div>
      <Button
        label="新しい記録を登録"
        icon="pi pi-plus"
        @click="$router.push('/fuel-records/create')"
        size="large"
      />
    </div>

    <Card class="filter-card">
      <template #content>
        <div class="filter-section">
          <label for="vehicle-select">車両で絞り込み</label>
          <Select
            id="vehicle-select"
            v-model="selectedVehicleId"
            :options="vehicleOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="すべての車両"
            class="vehicle-select"
            @change="handleVehicleChange"
          />
        </div>
      </template>
    </Card>

    <Message
      v-if="fuelRecordStore.isOfflineView"
      severity="warn"
      :closable="false"
      class="offline-view-message"
    >
      オフライン、またはサーバーに接続できないため、各車両の直近2件と未送信の記録のみ表示しています。編集・削除は接続できるようになってから行えます。
    </Message>

    <!-- スマホ用の表示切替タブ -->
    <div class="display-mode-tabs mobile-only">
      <button
        :class="['tab-button', { active: displayMode === 'card' }]"
        @click="displayMode = 'card'"
      >
        <i class="pi pi-th-large"></i>
        <span>カード表示</span>
      </button>
      <button
        :class="['tab-button', { active: displayMode === 'table' }]"
        @click="displayMode = 'table'"
      >
        <i class="pi pi-list"></i>
        <span>一覧表示</span>
      </button>
    </div>

    <div v-if="fuelRecordStore.loading" class="loading-container">
      <ProgressSpinner />
      <p>読み込み中...</p>
    </div>

    <div v-else-if="displayedRecords.length === 0" class="empty-state">
      <Card>
        <template #content>
          <div class="empty-content">
            <i class="pi pi-book" style="font-size: 4rem; color: #999"></i>
            <h2>給油記録がありません</h2>
            <p>「新しい記録を登録」ボタンから給油記録を登録してください</p>
            <Button
              label="記録を登録する"
              icon="pi pi-plus"
              @click="$router.push('/fuel-records/create')"
              size="large"
              class="mt-3"
            />
          </div>
        </template>
      </Card>
    </div>

    <!-- PC/タブレット用のテーブル表示 -->
    <Card v-else class="table-card desktop-table">
      <template #content>
        <DataTable
          :value="displayedRecords"
          stripedRows
          :paginator="true"
          :rows="10"
          :rowsPerPageOptions="[10, 20, 50]"
          responsiveLayout="scroll"
          class="fuel-table"
        >
          <Column field="date" header="日付" :sortable="true">
            <template #body="{ data }">
              {{ formatDate(data.date) }}
              <span v-if="data.pending" :class="['pending-badge', { error: data.sync_error }]">
                {{ data.sync_error ? '送信エラー' : '未送信' }}
              </span>
            </template>
          </Column>
          <Column field="vehicles.name" header="車両" :sortable="true">
            <template #body="{ data }">
              <div class="vehicle-cell">
                <strong>{{ data.vehicles?.name }}</strong>
                <span v-if="data.vehicles?.model" class="vehicle-model">
                  ({{ data.vehicles.model }})
                </span>
                <br />
                <small>{{ data.vehicles?.license_plate }}</small>
              </div>
            </template>
          </Column>
          <Column field="fuel_amount" header="給油量(L)" :sortable="true">
            <template #body="{ data }">
              {{ data.fuel_amount.toFixed(2) }}
            </template>
          </Column>
          <Column field="price_per_liter" header="単価(円/L)" :sortable="true">
            <template #body="{ data }">
              {{ data.price_per_liter.toFixed(2) }}
            </template>
          </Column>
          <Column field="total_cost" header="給油金額(円)" :sortable="true">
            <template #body="{ data }">
              {{ formatCurrency(data.total_cost) }}
            </template>
          </Column>
          <Column field="odometer" header="走行距離(km)" :sortable="true">
            <template #body="{ data }">
              {{ formatNumber(data.odometer) }}
            </template>
          </Column>
          <Column field="distance_from_previous" header="前回から(km)" :sortable="true">
            <template #body="{ data }">
              {{ data.distance_from_previous ? formatNumber(data.distance_from_previous) : '-' }}
            </template>
          </Column>
          <Column field="fuel_efficiency" header="燃費(km/L)" :sortable="true">
            <template #body="{ data }">
              <span v-if="data.fuel_efficiency" class="fuel-efficiency">
                {{ data.fuel_efficiency.toFixed(2) }}
              </span>
              <span v-else>-</span>
            </template>
          </Column>
          <Column header="操作" :exportable="false" style="min-width: 10rem">
            <template #body="{ data }">
              <div class="action-buttons">
                <Button
                  icon="pi pi-pencil"
                  rounded
                  outlined
                  severity="info"
                  :disabled="!canEdit(data)"
                  @click="$router.push(`/fuel-records/${data.id}/edit`)"
                  v-tooltip.top="'編集'"
                />
                <Button
                  icon="pi pi-trash"
                  rounded
                  outlined
                  severity="danger"
                  :disabled="!canDelete(data)"
                  @click="confirmDelete(data)"
                  v-tooltip.top="'削除'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- スマホ用のカード表示 -->
    <div v-if="displayedRecords.length > 0 && displayMode === 'card'" class="mobile-list">
      <Card
        v-for="record in mobileDisplayedRecords"
        :key="record.id"
        class="mobile-record-card"
        @click="showRecordDetail(record)"
      >
        <template #content>
          <div class="mobile-record-content">
            <div class="record-row">
              <span class="record-label">車両</span>
              <span class="record-value">{{ record.vehicles?.name }}</span>
            </div>
            <div v-if="record.pending" class="record-row">
              <span class="record-label">状態</span>
              <span :class="['pending-badge', { error: record.sync_error }]">
                {{ record.sync_error ? '送信エラー' : '未送信' }}
              </span>
            </div>
            <div class="record-row">
              <span class="record-label">日付</span>
              <span class="record-value">{{ formatDate(record.date) }}</span>
            </div>
            <div class="record-row">
              <span class="record-label">給油量</span>
              <span class="record-value highlight">{{ record.fuel_amount.toFixed(2) }} L</span>
            </div>
            <div class="record-row">
              <span class="record-label">走行距離</span>
              <span class="record-value">{{ formatNumber(record.odometer) }} km</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- もっと見るボタン -->
      <div v-if="hasMoreRecords" class="show-more-container">
        <Button
          :label="`もっと見る (残り${remainingRecordsCount}件)`"
          icon="pi pi-angle-down"
          @click="showMoreRecords"
          outlined
          class="show-more-button"
        />
      </div>
    </div>

    <!-- スマホ用の一覧表示 -->
    <div v-if="displayedRecords.length > 0 && displayMode === 'table'" class="mobile-table-view">
      <div class="simple-table">
        <div class="table-header">
          <div class="table-cell">車両</div>
          <div class="table-cell">日付</div>
          <div class="table-cell">給油量</div>
        </div>
        <div
          v-for="record in mobileDisplayedRecords"
          :key="record.id"
          class="table-row"
          @click="showRecordDetail(record)"
        >
          <div class="table-cell">{{ record.vehicles?.name }}</div>
          <div class="table-cell">
            {{ formatDateShort(record.date) }}
            <i
              v-if="record.pending"
              :class="['pi', record.sync_error ? 'pi-exclamation-triangle' : 'pi-cloud-upload', 'pending-icon', { error: record.sync_error }]"
              :aria-label="record.sync_error ? '送信エラー' : '未送信'"
            ></i>
          </div>
          <div class="table-cell">{{ record.fuel_amount.toFixed(2) }}L</div>
        </div>
      </div>

      <!-- もっと見るボタン -->
      <div v-if="hasMoreRecords" class="show-more-container">
        <Button
          :label="`もっと見る (残り${remainingRecordsCount}件)`"
          icon="pi pi-angle-down"
          @click="showMoreRecords"
          outlined
          class="show-more-button"
        />
      </div>
    </div>

    <!-- 詳細表示ダイアログ（スマホ用） -->
    <Dialog
      v-model:visible="detailDialogVisible"
      header="給油記録の詳細"
      :modal="true"
      :closable="true"
      :style="{ width: '90vw', maxWidth: '500px' }"
    >
      <div v-if="selectedRecord" class="detail-content">
        <Message v-if="selectedRecord.sync_error" severity="error" :closable="false" class="detail-sync-message">
          サーバーに登録できませんでした（{{ selectedRecord.sync_error }}）。内容を確認して、不要であれば削除してください。
        </Message>
        <Message v-else-if="selectedRecord.pending" severity="warn" :closable="false" class="detail-sync-message">
          この記録はまだ送信されていません。オンラインになると自動で送信されます。
        </Message>
        <div class="detail-row">
          <span class="detail-label">日付</span>
          <span class="detail-value">{{ formatDate(selectedRecord.date) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">車両</span>
          <div class="detail-value">
            <strong>{{ selectedRecord.vehicles?.name }}</strong>
            <span v-if="selectedRecord.vehicles?.model" class="vehicle-model-badge">
              {{ selectedRecord.vehicles.model }}
            </span>
            <br />
            <small>{{ selectedRecord.vehicles?.license_plate }}</small>
          </div>
        </div>
        <div class="detail-row">
          <span class="detail-label">給油量</span>
          <span class="detail-value">{{ selectedRecord.fuel_amount.toFixed(2) }} L</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">単価</span>
          <span class="detail-value">{{ selectedRecord.price_per_liter.toFixed(2) }} 円/L</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">給油金額</span>
          <span class="detail-value">{{ formatCurrency(selectedRecord.total_cost) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">走行距離</span>
          <span class="detail-value">{{ formatNumber(selectedRecord.odometer) }} km</span>
        </div>
        <div v-if="selectedRecord.distance_from_previous" class="detail-row">
          <span class="detail-label">前回から</span>
          <span class="detail-value">{{ formatNumber(selectedRecord.distance_from_previous) }} km</span>
        </div>
        <div v-if="selectedRecord.fuel_efficiency" class="detail-row">
          <span class="detail-label">燃費</span>
          <span class="detail-value highlight">{{ selectedRecord.fuel_efficiency.toFixed(2) }} km/L</span>
        </div>
      </div>
      <template #footer>
        <div class="detail-actions">
          <Button
            label="編集"
            icon="pi pi-pencil"
            :disabled="!selectedRecord || !canEdit(selectedRecord)"
            @click="$router.push(`/fuel-records/${selectedRecord?.id}/edit`)"
            severity="info"
            outlined
          />
          <Button
            label="削除"
            icon="pi pi-trash"
            :disabled="!selectedRecord || !canDelete(selectedRecord)"
            @click="confirmDelete(selectedRecord!)"
            severity="danger"
            outlined
          />
        </div>
      </template>
    </Dialog>

    <!-- 削除確認ダイアログ -->
    <Dialog
      v-model:visible="deleteDialogVisible"
      header="給油記録の削除"
      :modal="true"
      :closable="true"
      :style="{ width: '90vw', maxWidth: '500px' }"
    >
      <div class="dialog-content">
        <p v-if="recordToDelete?.pending">
          この未送信の記録を削除してもよろしいですか？（サーバーには送信されません）
        </p>
        <p v-else>この給油記録を削除してもよろしいですか？</p>
        <div v-if="recordToDelete" class="delete-info">
          <strong>{{ formatDate(recordToDelete.date) }}</strong>
          <br />
          <span>{{ recordToDelete.vehicles?.name }} - 給油量: {{ recordToDelete.fuel_amount }}L</span>
        </div>
        <Message severity="warn" :closable="false" class="mt-3">
          この操作は取り消せません。
        </Message>
      </div>
      <template #footer>
        <Button label="キャンセル" @click="deleteDialogVisible = false" severity="secondary" />
        <Button
          label="削除する"
          @click="handleDelete"
          severity="danger"
          :loading="fuelRecordStore.loading"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFuelRecordStore, type FuelRecord } from '@/stores/fuelRecord'
import { useVehicleStore } from '@/stores/vehicle'
import { useSyncStore } from '@/stores/sync'
import SyncStatus from '@/components/SyncStatus.vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Tooltip from 'primevue/tooltip'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const fuelRecordStore = useFuelRecordStore()
const vehicleStore = useVehicleStore()
const syncStore = useSyncStore()
const toast = useToast()

// 編集はオンラインかつ送信済みの記録のみ可能
const canEdit = (record: FuelRecord) => !syncStore.isOffline && !record.pending
// 未送信の記録は端末から削除するだけなのでオフラインでも削除可能
const canDelete = (record: FuelRecord) => record.pending || !syncStore.isOffline

const selectedVehicleId = ref<string | null>(null)
const deleteDialogVisible = ref(false)
const recordToDelete = ref<FuelRecord | null>(null)
const detailDialogVisible = ref(false)
const selectedRecord = ref<FuelRecord | null>(null)
const mobileDisplayLimit = ref(5)
const displayMode = ref<'card' | 'table'>('card')

const vehicleOptions = computed(() => {
  return [
    { label: 'すべての車両', value: null },
    ...vehicleStore.vehicles.map((v) => ({
      label: `${v.name} (${v.license_plate})`,
      value: v.id,
    })),
  ]
})

const displayedRecords = computed(() => {
  if (!selectedVehicleId.value) {
    return fuelRecordStore.records
  }
  return fuelRecordStore.recordsByVehicle(selectedVehicleId.value)
})

const mobileDisplayedRecords = computed(() => {
  return displayedRecords.value.slice(0, mobileDisplayLimit.value)
})

const hasMoreRecords = computed(() => {
  return displayedRecords.value.length > mobileDisplayLimit.value
})

const remainingRecordsCount = computed(() => {
  return displayedRecords.value.length - mobileDisplayLimit.value
})

onMounted(async () => {
  try {
    // 車両リストを取得
    if (vehicleStore.vehicles.length === 0) {
      await vehicleStore.fetchVehicles()
    }
    // 給油記録を取得
    await fuelRecordStore.fetchRecords()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: 'データの取得に失敗しました',
      life: 3000,
    })
  }
})

const handleVehicleChange = async () => {
  // フィルタリングはcomputedで自動的に行われる
  // 車両を変更したら表示件数をリセット
  mobileDisplayLimit.value = 5
}

const showMoreRecords = () => {
  // すべてのレコードを表示
  mobileDisplayLimit.value = displayedRecords.value.length
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatDateShort = (dateString: string) => {
  const date = new Date(dateString)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

const formatCurrency = (value: number | undefined) => {
  if (value === undefined) return '-'
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('ja-JP').format(value)
}

const showRecordDetail = (record: FuelRecord) => {
  selectedRecord.value = record
  detailDialogVisible.value = true
}

const confirmDelete = (record: FuelRecord) => {
  recordToDelete.value = record
  deleteDialogVisible.value = true
  detailDialogVisible.value = false
}

const handleDelete = async () => {
  if (!recordToDelete.value) return

  try {
    if (recordToDelete.value.pending) {
      await fuelRecordStore.discardPendingRecord(recordToDelete.value.id)
    } else {
      await fuelRecordStore.deleteRecord(recordToDelete.value.id)
    }
    toast.add({
      severity: 'success',
      summary: '成功',
      detail: '給油記録を削除しました',
      life: 3000,
    })
    deleteDialogVisible.value = false
    recordToDelete.value = null
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: '給油記録の削除に失敗しました',
      life: 3000,
    })
  }
}
</script>

<style scoped>
.fuel-record-list-container {
  min-height: 100vh;
  background: var(--vt-c-bg-lavender);
  padding: 1.5rem;
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
  flex-wrap: wrap;
}

.offline-view-message {
  max-width: 600px;
  margin: 0 auto 1.5rem;
}

.detail-sync-message {
  margin-bottom: 1rem;
}

.pending-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
}

.pending-badge.error {
  background: #fee2e2;
  color: #b91c1c;
}

.pending-icon {
  margin-left: 0.25rem;
  color: #b45309;
}

.pending-icon.error {
  color: #b91c1c;
}

.page-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vt-c-text-primary);
  margin: 0;
}

.page-header :deep(.p-button) {
  background: var(--vt-c-secondary);
  border: none;
  border-radius: 12px;
  padding: 0.625rem 1.25rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
}

.page-header :deep(.p-button:hover) {
  background: var(--vt-c-secondary-dark);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
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

.filter-card {
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.filter-card :deep(.p-card) {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-section label {
  font-weight: 600;
  color: var(--vt-c-text-primary);
  font-size: 0.875rem;
}

.vehicle-select {
  width: 100%;
  font-size: 1rem;
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
  background: var(--vt-c-secondary);
  border: none;
  border-radius: 12px;
  padding: 0.625rem 1.25rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
}

.table-card {
  max-width: 1200px;
  margin: 0 auto;
}

.table-card :deep(.p-card) {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.fuel-table :deep(.p-datatable-thead > tr > th) {
  font-size: 0.875rem;
  font-weight: 600;
  background: var(--vt-c-bg-lavender);
  color: var(--vt-c-text-primary);
}

.fuel-table :deep(.p-datatable-tbody > tr > td) {
  font-size: 0.875rem;
  color: var(--vt-c-text-secondary);
}

.vehicle-cell {
  line-height: 1.5;
}

.vehicle-cell strong {
  color: var(--vt-c-text-primary);
}

.vehicle-cell small {
  color: var(--vt-c-text-tertiary);
}

.vehicle-model {
  color: var(--vt-c-primary);
  font-size: 0.875rem;
  font-weight: 500;
  margin-left: 0.5rem;
}

.fuel-efficiency {
  font-weight: 600;
  color: var(--vt-c-primary);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

/* スマホ用の表示切替タブ（デフォルトでは非表示） */
.mobile-only {
  display: none;
}

/* display は .mobile-only で制御する（ここで指定すると PC でも表示されてしまう） */
.display-mode-tabs {
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  background: white;
  border-radius: 12px;
  padding: 0.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.tab-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: var(--vt-c-text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-button i {
  font-size: 1rem;
}

.tab-button.active {
  background: var(--vt-c-primary);
  color: white;
  box-shadow: 0 2px 8px rgba(91, 95, 237, 0.3);
}

.tab-button:hover:not(.active) {
  background: var(--vt-c-bg-blue-light);
  color: var(--vt-c-primary);
}

/* スマホ用のリスト表示（デフォルトでは非表示） */
.mobile-list {
  display: none;
}

.mobile-table-view {
  display: none;
}

/* 一覧表示用のシンプルテーブル */
.simple-table {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  background: var(--vt-c-bg-lavender);
  padding: 0.75rem;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--vt-c-text-primary);
  border-bottom: 1px solid var(--vt-c-divider-light-2);
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 0.75rem;
  border-bottom: 1px solid var(--vt-c-divider-light-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: var(--vt-c-bg-blue-light);
}

.table-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.875rem;
  color: var(--vt-c-text-primary);
}

.table-header .table-cell {
  font-weight: 600;
}

.mobile-record-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mobile-record-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.mobile-record-content {
  position: relative;
  padding: 0.5rem 0;
}

.record-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--vt-c-divider-light-2);
}

.record-row:last-child {
  border-bottom: none;
}

.record-label {
  font-size: 0.875rem;
  color: var(--vt-c-text-secondary);
  font-weight: 600;
}

.record-value {
  font-size: 0.875rem;
  color: var(--vt-c-text-primary);
  font-weight: 500;
}

.record-value.highlight {
  color: var(--vt-c-secondary);
  font-weight: 600;
  font-size: 1rem;
}

/* もっと見るボタン */
.show-more-container {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
  padding: 1rem 0;
}

.show-more-button {
  width: 100%;
  max-width: 300px;
  border-color: var(--vt-c-primary);
  color: var(--vt-c-primary);
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.show-more-button:hover {
  background: var(--vt-c-primary);
  color: white;
  border-color: var(--vt-c-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(91, 95, 237, 0.3);
}

/* 詳細表示ダイアログ */
.detail-content {
  padding: 0.5rem 0;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--vt-c-divider-light-2);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 0.875rem;
  color: var(--vt-c-text-secondary);
  font-weight: 600;
  min-width: 100px;
}

.detail-value {
  font-size: 0.875rem;
  color: var(--vt-c-text-primary);
  text-align: right;
}

.detail-value.highlight {
  color: var(--vt-c-primary);
  font-weight: 600;
  font-size: 1rem;
}

.detail-value strong {
  color: var(--vt-c-text-primary);
}

.detail-value small {
  color: var(--vt-c-text-tertiary);
}

.vehicle-model-badge {
  display: inline-block;
  background: var(--vt-c-bg-blue-light);
  color: var(--vt-c-primary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.5rem;
}

.detail-actions {
  display: flex;
  gap: 0.75rem;
}

.detail-actions button {
  flex: 1;
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
  font-size: 1rem;
}

/* PC画面（768px以上） */
@media (min-width: 768px) {
  .fuel-record-list-container {
    padding: 2rem;
  }

  .filter-card {
    max-width: 700px;
  }

  .table-card {
    max-width: 1400px;
  }
}

/* スマホ画面（768px未満） */
@media (max-width: 767px) {
  .fuel-record-list-container {
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

  /* スマホでは「ホーム」「給油記録」と同じ行の右端に表示する */
  .sync-status-slot {
    margin-left: auto;
  }

  .page-header h1 {
    font-size: 1.125rem;
  }

  .filter-card {
    max-width: 100%;
  }

  .vehicle-select {
    max-width: 100%;
  }

  /* スマホではPC用テーブルを非表示に */
  .desktop-table {
    display: none;
  }

  /* スマホ用のタブを表示 */
  .mobile-only {
    display: flex;
  }

  /* 表示モードに応じて表示切り替え */
  .mobile-list {
    display: block;
  }

  .mobile-table-view {
    display: block;
  }
}
</style>
