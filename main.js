const golos = require('golos') // импортируем модуль голоса
const util = require('util') // это встроенный в node.js модуль
const Promise = require("bluebird") // импортируем модуль Bluebird -- самую популярную имплементацию Promise
const _ = require('lodash') // как уже понятно, импортируем lodash ^_^
const accountName = 'ontofractal' // аккаунт пользователя, который запускает бота
const postingKey = process.env.GOLOS_POSTING_KEY // предпочтительный вариант: используем environment variable для доступа к приватному постинг ключу
// const postingKey = '5K...' //  альтернативный вариант: вводим приватный ключ прямо в код
const accountVotesToFollow = ['academy'] // array аккаунтов, голоса которых мы будем повторять

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
    // используем метод flatten модуля lodash для извлечения элементов из вложенных списков и помещения в одноуровней список
    return _.flatten(blockData.transactions.map(tx => tx.operations))
}

const reactToIncomingVotes = (voteData) => {
    const {voter, author, permlink, weight} = voteData
    // проверяем входит ли проголосовавший аккаунт в список
    const isMatchingVoter = accountVotesToFollow.includes(voter)
    // проверяем не является ли это флагом, т.е. имеет вес ниже 0
    // если сделать строго больше 0, то голоса не будут сниматься, даже если аккаунт убрал свой голос за пост
    const isMatchingWeight = weight >= 0
    if (isMatchingVoter && isMatchingWeight) {
        golos.broadcast.vote(postingKey, accountName, author, permlink, weight, (err, result) => {
            if (err) {
                console.log('===========ПРОИЗОШЛА ОШИБКА, БОТ НЕ ГОЛОСОВАЛ===========')
                console.log(err)
            } else {
                // используем ES2016 template strings, которые позволяют форматировать строки интерполируя expressions с помощью ${}
                console.log(`@${accountName} проголосовал за пост ${permlink} написанный @${author} c весом ${weight}`)
            }
        })
    }
}

const selectOpHandler = (op) => {
    // используем destructuring, очень удобную фичу EcmaScript2016
    // это, конечно, не паттерн метчинг Elixir или Elm, но все равно сильно помогает улучшить читаемость кода
    const [opType, opData] = op
    if (opType === 'vote') {
        reactToIncomingVotes(opData)
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
