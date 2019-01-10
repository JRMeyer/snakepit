const cluster = require('cluster')
const cpus = require('os').cpus().length
const log = require('./utils/logger.js')
const config = require('./config.js')
const models = require('./models')
const scheduler = require('./scheduler.js')
const pitRunner = require('./pitRunner.js')

if (cluster.isMaster) {
    models.sequelize.sync()
    models.all.forEach(model => (model.startup || Function)())
    pitRunner.tick()
    scheduler.tick()
    for (let i = 0; i < cpus; i++) {
        cluster.fork()
    }
    cluster.on('exit', function(deadWorker, code, signal) {
        if (code === 100) {
            process.exit(100) // Preventing fork-loop on startup problems
        }
        var worker = cluster.fork();
        log.error('Worker ' + deadWorker.process.pid + ' died.')
        log.info('Worker ' + worker.process.pid + ' born.')
    })
} else {
    try {
        const http = require('http')
        const morgan = require('morgan')
        const express = require('express')
        const bodyParser = require('body-parser')

        let app = express()
        app.use(bodyParser.json({ limit: '50mb' }))
        app.use(morgan('combined', {
            skip: (req, res) => res.statusCode < 400 && !config.debugHttp
        }))
        
        app.use(require('./routes'))

        app.use(function (err, req, res, next) {
            console.error(err.stack)
            res.status(500).send('Something broke')
        })

        http.createServer(app).listen(config.port, config.interface)
        log.info('Snakepit service running on ' + config.interface + ':' + config.port)
    } catch (ex) {
        log.error('Failure during startup: ' + ex)
        process.exit(100)
    }
}
