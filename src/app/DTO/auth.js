// src/app/dto/auth.js

/**
 * @typedef {Object} ServerUser
 * @property {number|string} rut
 * @property {string} name
 * @property {string} email
 * @property {string|number} rol
 */

/**
 * @typedef {Object} WebLoginResponse
 * @property {boolean} status
 * @property {string} message
 * @property {{token_type:string, access_token:string, expires_at:(string|null), user:ServerUser}|null} data
 * @property {any} error
 */

/**
 * @typedef {Object} AuthSession
 * @property {string} tokenType
 * @property {string} token
 * @property {string|null} expiresAt
 */

/**
 * @typedef {Object} UsuarioDoc  // lo que guardas en PouchDB
 * @property {string} _id          // ej: "user:14355408"
 * @property {"user"} type
 * @property {number|string} rut
 * @property {string} nombre
 * @property {string} email
 * @property {string|number} rol
 * @property {string} lastLoginAt
 * @property {string=} offlinePinSalt
 * @property {string=} offlinePinHash
 */

/**
 * @typedef {Object} LoginDTO
 * @property {boolean} status
 * @property {string} message
 * @property {AuthSession=} session
 * @property {UsuarioDoc=} user
 */
