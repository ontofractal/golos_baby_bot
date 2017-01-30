const golos = require('golos') // импортируем модуль голоса
const util = require('util')
const Promise = require("bluebird") // импортируем модуль Bluebird -- самую популярную имплементацию Promise
const _ = require('lodash')
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

// создадим функцию, которая достанет все операции из всех транзакций блока и поместит их в array
const unnestOps = (blockData) => {
    // метод map создает новый array применяя функцию переданную в первый аргумент к каждому элементу
    // используем метод flatten модуля lodash для уплощения(?!) вложенных списков
    return _.flatten(blockData.transactions.map(tx => tx.operations))
}

const selectOpHandler = (op) => {
    // используем destructuring, очень удобную фичу EcmaScript2016
    // это, конечно, не паттерн метчинг Elixir или Elm, но все равно сильно помогает улучшить читаемость кода
    const [opType, opData] = op
    if (opType === 'vote') {
        // используем ES2016 template strings, которые позволяют форматировать строки интерполируя expressions с помощью ${}
        console.log(`@${opData.voter} проголосовал за пост ${opData.permlink} написанный @${opData.author} c весом ${opData.weight}`)
    }
}

// поменяем имя функции с getBlockData на processBlockData т.к. ее назначение изменилось
const processBlockData = height => {
    golos.api.getBlock(height, (err, result) => {
        if (err) {
            console.log(err)
        }
        else {
            console.log('')
            console.log('============ НОВЫЙ БЛОК ============')
            // console.log(result) заменим на
            unnestOps(result)
            // в отличие от map, метод forEach не возвращает список с результатом применения функции
            // также как и map, метод forEach применяет переданную в него функцию к каждому элементу array
            // forEach используется для указания того, что результат применения функции является side effect
                .forEach(selectOpHandler) // передаем функцию, которая определит, что делать
        }
    })
}


const startFetchingBlocks = startingHeight => {
    let height = startingHeight
    setInterval(() => {
        processBlockData(height)
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
