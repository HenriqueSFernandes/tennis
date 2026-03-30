// Re-exports from new feature-based API structure for backwards compatibility

export {
  ApiError,
  fetchBlob,
  request,
  verifyPassword,
} from "./core/api";

export {
  addAccount,
  deleteAccount,
  getAccounts,
  updateAccount,
} from "./features/accounts/api";
export {
  book,
  cancelBook,
  exportBookings,
  getBookings,
} from "./features/bookings/api";
export {
  addFavorite,
  bulkBook,
  deleteFavorite,
  getFavorites,
  updateFavorite,
} from "./features/favorites/api";
export { getSchedule } from "./features/schedule/api";
