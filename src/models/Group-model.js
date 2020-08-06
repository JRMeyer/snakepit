const fs = require('fs-extra')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const Sequelize = require('sequelize')
const sequelize = require('./db.js')
const config = require('../config.js')
const log = require('../utils/logger.js')

var Group = sequelize.define('group', {
    id:           { type: Sequelize.STRING, allowNull: false, primaryKey: true },
    title:        { type: Sequelize.STRING, allowNull: true }
})

const groupPrefix = '/data/groups/'

Group.afterCreate(async group => {
    let groupDir = groupPrefix + group.id
    if (!(await fs.pathExists(groupDir))) {
        await fs.mkdirp(groupDir)
    }
})

Group.afterDestroy(async group => {
    let groupDir = groupPrefix + group.id
    if (await fs.pathExists(groupDir)) {
        await fs.move(groupDir, '/data/trash/' + uuidv4())
    }
})

Group.getDir = (groupId) => groupPrefix + groupId
Group.prototype.getDir = function () {
    return Group.getDir(this.id)
}

Group.getDirExternal = (groupId) => path.join(config.mountRoot, 'groups', groupId + '')
Group.prototype.getDirExternal = function () {
    return Group.getDirExternal(this.id)
}

module.exports = Group
