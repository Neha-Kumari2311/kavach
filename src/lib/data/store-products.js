/**
 * Curated Safety Store products with real buy links.
 * Images use inline SVG data URIs (always load, no external dependency).
 */

export const STORE_CATEGORIES = [
  'All',
  'Pepper Spray',
  'Personal Alarm',
  'GPS Tracker',
  'Safety Keychain',
  'Stun Device',
  'Self Defense',
  'Safety Kit',
];

// Simple SVG icon generator for product cards
function productSvg(emoji, bgColor) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="${bgColor}"/><text x="200" y="220" font-size="120" text-anchor="middle" dominant-baseline="central">${emoji}</text></svg>`)}`;
}

export const STORE_PRODUCTS = [
  {
    id: 'sirona-pepper-spray',
    name: 'Sirona IMPOWER Pepper Spray',
    category: 'Pepper Spray',
    description: 'Self defence pepper spray for women safety. Compact & effective.',
    imageUrl: productSvg('🌶️', '#FEE2E2'),
    buyUrl: 'https://blinkit.com/prn/sirona-impower-self-defence-pepper-spray/prid/501459',
  },
  {
    id: 'impower-pepper-spray',
    name: 'IMPOWER Self Defence Green Chilli Spray',
    category: 'Pepper Spray',
    description: 'Strong self defence spray with safety lock. Range up to 12 feet.',
    imageUrl: productSvg('🧴', '#DCFCE7'),
    buyUrl: 'https://www.amazon.in/Impower-Defence-Green-Chilli-Spray/dp/B075KC6SLD/ref=sr_1_6_in_f3_0o_at_mod_primary_alm?crid=2AYU2IYSGIPLJ&dib=eyJ2IjoiMSJ9.93z-GxaxnDeMGrFIuP8dGn8tOD_ug9sdInh8PM0IKkCFBwHjs7dr2XWinABOYDTS1A031HZ_ifISgdj6AgYPm21CwutiXMvoX8QjmhctM4tr16RhZZRKBrEyg_aHMHragsCBtBJMGmlGrK9BPsNMF25JmEMWtf79kk7bmwB0ke0WZ7eogRhoiTqahrXDQYautq76FgrQxMhCi1DICsD8ZWZCtKQ0YPbIGtctzsmq7eNqckJK4YDNSYW0lt3lhGoVErxCtwhQbaW5juOojVa9O0I4qPN_Yuk3qO-fSThOCXU.om-LaQOzDOVzVoq467hihYZRsnWvEFLSjNYTLAl2GNw&dib_tag=se&keywords=women+safety+kit&qid=1783497631&sbo=m6DjfpMzMLDmL8pSMKX8hw%3D%3D&sprefix=women+safety+kit%2Caps%2C380&sr=8-6',
  },
  {
    id: 'personal-alarm',
    name: 'Le Figaro Water Alarm Bell',
    category: 'Personal Alarm',
    description: 'Loud personal alarm for emergencies. Compact keychain design.',
    imageUrl: productSvg('🚨', '#FEF3C7'),
    buyUrl: 'https://blinkit.com/prn/le-figaro-water-alarm-bell/prid/766264',
  },
  {
    id: 'apple-airtag',
    name: 'Apple AirTag',
    category: 'GPS Tracker',
    description: 'Precision finding. Track your belongings via Find My network.',
    imageUrl: productSvg('📍', '#DBEAFE'),
    buyUrl: 'https://blinkit.com/prn/apple-airtag/prid/619597',
  },
  {
    id: 'safety-keychain',
    name: 'Devil Will Emergency Safety Keychain',
    category: 'Safety Keychain',
    description: 'Emergency keychain with protection tools for women safety.',
    imageUrl: productSvg('🔑', '#FED7AA'),
    buyUrl: 'https://www.amazon.in/Devil-Will-Emergency-Keychain-Protection/dp/B0BPPZFZJD/ref=sr_1_1_sspa?crid=2R4HPD4OPX37L&dib=eyJ2IjoiMSJ9.-A6UvuZ2sU9cNaVzQcV0r8Qh3DQgO7hgj8liH1oP2kUIuHySC8XVf8stI8n3utOiK8M-Ex5xr97ZCQ5fd4T2VK0UT3QK_BpnT2Q61-qXysHV7oM1yhyc-dvJXDCQYiSHGaUWvRc_r-HxE3y8hLY8FR4jCjZcxAYM_DGSvIdeoysigOlOUnxYknuYCvIYl5O2e8o_4t7l0MCa2LKFHXY8gRgDEJHduE71icvRv6r4iTb9juEq8gWPwYB3odUELANhjf0c2Ca0r3Uvpkv3JxCg0-8BK09leqYezeyvnCIuED4.8X17TSKF831MQjN2oi-joJcVwBN6NwsD9zf4VhmFEcY&dib_tag=se&keywords=safety+key+chain&qid=1783497538&sprefix=safety+key+chai%2Caps%2C378&sr=8-1-spons&aref=bZnHmkwW3M&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&psc=1',
  },
  {
    id: 'stun-gun-flashlight',
    name: 'Stun Gun with Flashlight',
    category: 'Stun Device',
    description: 'Electric self defence flashlight. Aluminium body, portable & rechargeable.',
    imageUrl: productSvg('⚡', '#FEF9C3'),
    buyUrl: 'https://www.amazon.in/Defence-Flashlight-Electric-Aluminium-Portable/dp/B0H5Z3VWHN/ref=sr_1_2?crid=2XG7JSIDYSULJ&dib=eyJ2IjoiMSJ9.jhZ7PAfm6IA-yGq34pt0tvZZGlVvPSJM76fRNaeFhw7VkuSB75kfzZBYjJ5vvDcUji8HepK2ayf4tud9jvTscCL1vvrtWCIHiZNgdVM20mqIpHkV6OBGWapx1FXBSjLf49XvDoKYwApZVdlDcdzDjl9O9bm3yqwDuABhK4RS89R_NFTpcA3FQ4hLXHbma54YY01qCq2Eh5rVsSVRd7WCJHERMBlJyord_x9xR4wS2oFJvEvFtSU1i8yVlndOtIXw71oh9EP7tA8EI9mjXuxIDSTCbRWyQJjpNFPPQZ_iUf0.e-wnLKruzeQvln1JGmChTUehPo1vrftdqXho9KacdTs&dib_tag=se&keywords=stun+gun+with+flashlight&qid=1783497585&sprefix=stun+gun+with+flashlig%2Caps%2C373&sr=8-2',
  },
  {
    id: 'tactical-pen',
    name: 'Tactical Self Defence Pen',
    category: 'Self Defense',
    description: 'Military survival pen with tungsten steel tip. Glass breaker + writing pen.',
    imageUrl: productSvg('🖊️', '#E2E8F0'),
    buyUrl: 'https://www.amazon.in/Origin-Joy-Tactical-Military-Survival-Tungsten/dp/B0DQWKC5S8/ref=sr_1_3?crid=11E1P0OCA6P0Z&dib=eyJ2IjoiMSJ9.B1lT0N-JWH3StpExfxUS59pdYZ42_EYY8Lg5jbXvV-dgCtjHWZSAy5eSQsB-d1V-bvlOSzPHu3ythUVr31NaVm3DZ6d_weQuCUbp4WloCwVzbShC7GVE3FsdKjPGGs_WQHAbT-Gv3JukGiMnhcfy_5uvMJQKTpQ0kAzfPsCyp36oo3vFsW-IETQTipSYQ0W0Ca8VZ7sKpPxAFlm7qFCfllPrxkbG5_C6At7dxIY8cy0VykYfWM2NIJi41QA_GungFasyeUUsms-VWm963zCIT56hHTZ48BP4wZi_gJg15S4.783QBuFNlOrNzZjSYiV7VG6ff1uy_lpy-f_5VC495Go&dib_tag=se&keywords=tactical%2Bself%2Bdefense%2Bpen&qid=1783497683&sprefix=tactical%2Bself%2Bdefense%2Bpe%2Caps%2C375&sr=8-3&th=1',
  },
  {
    id: 'door-stop-alarm',
    name: 'Door Stop Security Alarm',
    category: 'Safety Kit',
    description: 'Wireless window/door security alarm system. Perfect for travel & home.',
    imageUrl: productSvg('🚪', '#CFFAFE'),
    buyUrl: 'https://www.amazon.in/Wireless-Window-Security-System-Standard/dp/B09MJG2DYW/ref=sr_1_1_sspa?crid=AIGEWHVF4KEC&dib=eyJ2IjoiMSJ9.ODUecwk4VjevJUX3aCUL245W8bH-v4GVJRVGnIfmL4_DqwG_KpjKGNuJ3yPdPfezvYIpJc-rzrJszyu843elc7rQodWA4cWzIqNoqyuXIc-PDqal0yJPmTGgbwMivUcfrD_kidkVbHjFeWiEcGzf7QPf92VrMr1ovIj1nHLKIhvfidLdRK8OCkwmtICj7BhKspmE48skOW7Sr4Of6QvIQDsd4BxBcrLXj4_FVTzZ54vyaDoVcy-xF61y0yHXQ5A_YPGJbxTOtDiU2tX44Y5GKWpfbsoDZhnkgK0oq1urDCY.Vtghwb7fMuHzxEda-5VFDj5bcUIN6BXryj9EKfV7lf8&dib_tag=se&keywords=door+stp+security+alarm&qid=1783497744&sprefix=door+stp+security+alar%2Caps%2C374&sr=8-1-spons&aref=uLuCL7fzmE&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&psc=1',
  },
  {
    id: 'hidden-camera-detector',
    name: 'Hidden Camera Detector',
    category: 'Safety Kit',
    description: 'Anti-spy camera detector & protector. RF scanner + infrared lens finder.',
    imageUrl: productSvg('🔍', '#FFE4E6'),
    buyUrl: 'https://www.amazon.in/AVNISH-Hidden-Camera-Detectors-Protector/dp/B0FJ647W1V/ref=sr_1_1_sspa?crid=27G88SVLBEJAQ&dib=eyJ2IjoiMSJ9.XDS5CRmwKUa0XZV0QK4Hsmzdjp5zvoWQJO7EwSrwOq22cYDnqtbMUf-8tMC04Kzyd5flLewPfq1sSgNI2f3ac-1PE-cucNurPBxJFP7h9ydQgQeHsiamhwx_xvuF0iPaE7tbWsT9U9E1oI5JrgRNbwKIltn3oMLHVL1Wf3C5ew6qPR6fprZE0iCbdxNXhXrgi_7n79L7p9MF2gkZF5e_lumBfJ3k66gA8hiyA--f-UY.az4kkbRWspNWCEoqA80vwJ2ormMZIPycBWFHyNWqHd4&dib_tag=se&keywords=hidden+camera+detector&qid=1783497785&sprefix=hidden+camera+detect%2Caps%2C381&sr=8-1-spons&aref=liMvXMK2Ys&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&psc=1',
  },
];
