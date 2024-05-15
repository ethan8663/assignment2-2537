const express = require('express');
const router = express.Router()
router.get('/', (req, res) => {
    res.send('this is comment')
})
router.get('/detail', (req, res) => {
    res.send('this is comment detail')
})
router.post('/', (req, res) => {
    res.send('this is comment')
})

module.exports = router