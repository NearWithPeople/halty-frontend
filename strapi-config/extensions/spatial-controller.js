/**
 * Strapi Custom Controller: Spatial Radius Vacancy Search
 * Place in: src/api/vacancy/controllers/vacancy.js
 */
'use strict';

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = {
  async nearby(ctx) {
    const { lat, lng, radius = 2000, category } = ctx.query;
    if (!lat || !lng) {
      return ctx.badRequest('Parameters lat and lng are required');
    }

    const targetLat = parseFloat(lat);
    const targetLng = parseFloat(lng);
    const radMeters = parseFloat(radius);

    const filters = {};
    if (category && category !== 'all') {
      filters.category = category;
    }

    const entries = await strapi.entityService.findMany('api::vacancy.vacancy', {
      filters,
      populate: '*',
      limit: 100,
    });

    const nearbyEntries = entries.filter((item) => {
      if (!item.lat || !item.lng) return false;
      const d = haversineDistanceMeters(targetLat, targetLng, item.lat, item.lng);
      return d <= radMeters;
    });

    return { data: nearbyEntries, count: nearbyEntries.length };
  },
};
