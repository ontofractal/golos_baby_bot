
const golos = require('golos') // импортируем модуль голоса
const Promise = require("bluebird") // импортируем модуль Bluebird -- самую популярную имплементацию Promise
const accountName = '' // аккаунт пользователя, который запускает бота
const postingKey = '' // приватный постинг ключ пользователя, который запускает бота
const accountNameToFollow = 'academy' // аккаунт пользователя за которым следим

// создаем новый Promise обворачивая golos.api.getDynamicGlobalProperties
const dynamicGlobalProperties = new Promise((resolve, reject) => {
    golos.api.getDynamicGlobalProperties((err, result) => {
        if (err) {
            reject(err)
        }
        else {
            resolve(result)
        }
    })
})

const pluckBlockHeight = x => x.head_block_number

const getBlockData = height => {
    golos.api.getBlock(height, (err, result) => {
        if (err) {
            console.log(err)
        }
        else {
            console.log('')
            console.log('============ НОВЫЙ БЛОК ============')
            console.log(result)
        }
    })
}

const startFetchingBlocks = startingHeight => {
    let height = startingHeight
    setInterval(() => {
        getBlockData(height)
        height = height + 1 // брррр, мутация
        // у нас есть доступ к переменной height благодаря closure
    }, 3000)
    // Задаем интервал в 3000 мс т.к. блок Голоса генерируется каждые три секунды
}

// резолвим Promise
dynamicGlobalProperties
    .then(pluckBlockHeight)
    .then(startFetchingBlocks)
    .catch(e => console.log(e))
