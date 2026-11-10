/* Where students can reach us. ig.me and instagram.com links are opened by the
   Instagram app when it's installed (iOS universal links / Android app links),
   and fall back to the website otherwise. */

export const INSTAGRAM_HANDLE = 'studywith_labobo';
export const INSTAGRAM_PROFILE = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;
export const INSTAGRAM_DM = `https://ig.me/m/${INSTAGRAM_HANDLE}`;

export const CONTACT_EMAIL = 'contact@studywithlabobo.online';
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Studywith Labobo: help')}`;
