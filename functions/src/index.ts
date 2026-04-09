import { initializeApp } from "firebase-admin/app";

initializeApp();

export { onUserSignIn } from "./auth/onUserCreate";
export { createShop } from "./shops/createShop";
export { checkAvailability } from "./booking/checkAvailability";
export { bookAppointment } from "./booking/bookAppointment";
export { cancelAppointment } from "./booking/cancelAppointment";
