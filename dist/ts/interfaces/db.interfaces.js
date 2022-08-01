"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);
const { DBRef } = mongoose.SchemaTypes;
