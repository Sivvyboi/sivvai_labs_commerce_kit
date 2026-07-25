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
