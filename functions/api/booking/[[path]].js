import {handleBooking} from '../../../lib/booking-api.mjs';
export const onRequest=context=>handleBooking(context.request,context.env,{waitUntil:context.waitUntil.bind(context)});
