// src/db/views/userViews.js
export function byTypeAndUser(doc) {
    if (doc.type === 'usuario') {
        emit([doc.type, doc.user], null);
    }
}