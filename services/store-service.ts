import * as storeRepo from "@/lib/db/store";

export async function getStoreSettings() {
  return storeRepo.getStoreSettings();
}

export async function getBrandProfile() {
  return storeRepo.getBrandProfile();
}

export async function getFeatureFlags() {
  return storeRepo.getFeatureFlags();
}

// ---------------------------------------------------------------------------
// Admin service functions
// ---------------------------------------------------------------------------

export async function updateStoreSettings(id: string, data: storeRepo.StoreSettingsUpdate) {
  return storeRepo.updateStoreSettings(id, data);
}

export async function updateBrandProfile(id: string, data: storeRepo.BrandProfileUpdate) {
  return storeRepo.updateBrandProfile(id, data);
}

export async function setFeatureFlag(key: string, enabled: boolean) {
  return storeRepo.upsertFeatureFlag(key, enabled);
}

