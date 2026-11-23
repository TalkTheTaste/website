import {handleBooking} from '../../../lib/booking-api.mjs';
export const onRequest=({request,env})=>handleBooking(request,env);
