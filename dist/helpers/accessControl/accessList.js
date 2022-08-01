"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionnality = exports.ressource = exports.action = void 0;
const action = {
    manage: 'manage',
    create: 'create',
    read: 'read',
    update: 'update',
    delete: 'delete',
    send: 'send',
};
exports.action = action;
const ressource = {
    all: 'all',
    users: 'users',
    structures: 'structures',
};
exports.ressource = ressource;
const functionnality = {
    email: 'email',
};
exports.functionnality = functionnality;
