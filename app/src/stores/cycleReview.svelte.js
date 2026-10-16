import { storageGetJSON, storageSetJSON } from "../lib/storage.js";
import { createCycleReview, KEYS } from "../lib/schema.js";

let reviews = $state([]);

export function cycleReviewState() {
  return {
    get reviews() { return reviews; },
    get sortedReviews() {
      return [...reviews].sort((a, b) => b.completedDate.localeCompare(a.completedDate));
    },
  };
}

export async function loadCycleReviews() {
  reviews = (await storageGetJSON(KEYS.CYCLE_REVIEWS, [])) || [];
}

export async function saveCycleReview(reviewData) {
  const review = { ...createCycleReview(reviewData), ...reviewData };
  reviews = [review, ...reviews];
  await storageSetJSON(KEYS.CYCLE_REVIEWS, reviews);
  return review;
}

export async function updateCycleReview(reviewId, patch) {
  reviews = reviews.map(r => r.id === reviewId ? { ...r, ...patch } : r);
  await storageSetJSON(KEYS.CYCLE_REVIEWS, reviews);
}

export async function wipeCycleReviews() {
  reviews = [];
  await storageSetJSON(KEYS.CYCLE_REVIEWS, []);
}
