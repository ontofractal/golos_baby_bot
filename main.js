const golos = require('golos') // импортируем модуль голоса
const util = require('util') // это встроенный в node.js модуль
const Promise = require("bluebird") // импортируем модуль Bluebird -- самую популярную имплементацию Promise
const _ = require('lodash') // как уже понятно, импортируем lodash ^_^
console.log('===================БОТ ЗАПУЩЕН===================')
const config = require('./config')
const botState = require('./state_manager')
const {operatorAccountName, operatorPostingKey} = config

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
    // используем метод flatten модуля lodash для извлечения элементов из вложенных списков и помещения в одноуровневый список
    return _.flatten(blockData.transactions.map(tx => tx.operations))
}

const checkStateAndUpvotePost = (author, permlink, weight, delay) => {
    // откладываем голосование за пост на delay
    setTimeout(
        () => golos.api.getActiveVotes(
            author,
            permlink,
            (err, result) => {
                // проверяем есть ли в списке активных голосов аккаунт оператора
                const operatorHasVoted = result.map(x => x.voter).includes(operatorAccountName)
                // если нет JSONRPC запроса и аккаунт оператора не голосовал --> проголосовать
                if (!err && !operatorHasVoted) {
                    // передаем данные для голосования на ноду
                    golos.broadcast.vote(operatorPostingKey, operatorAccountName, author, permlink, weight, (err, result) => {
                        if (err) {
                            console.log('произошла ошибка с передачей голоса на ноду:')
                            console.log(err)
                        } else {
                            // используем ES2016 template strings, которые позволяют форматировать строки интерполируя expressions с помощью ${}
                            console.log(`@${operatorAccountName} проголосовал за пост ${permlink} написанный @${author} c весом ${weight}`)
                        }
                    })
                } else if (operatorHasVoted) {
                    // пишем лог, если оператор уже голосовал за этот пост/комментарий
                    console.log(`Изебгая повтора, бот не проголосовал за пост ${permlink} написанный ${author}`)
                }
            }
        ),
        delay
    )
}

const reactToIncomingVotes = (voteData) => {
    // console.log(voteData)
    const {voter, author, permlink, weight} = voteData
    // проверяем входит ли проголосовавший аккаунт в список аккаунтов, чьи голоса мы копируем
    const isMatchingVoter = botState.accountVotesToCopy.includes(voter)
    // проверяем не является ли это флагом, т.е. имеет вес ниже 0
    // если сделать строго больше 0, то голоса не будут сниматься, даже если аккаунт убрал свой голос за пост
    const isMatchingWeight = weight >= 0
    if (isMatchingVoter && isMatchingWeight) {
        console.log(`Обнаружено соответствие правилу копирования голосов: ${voter} проголосовал за ${permlink} написанный ${voter} с весом в ${weight}`)
        checkStateAndUpvotePost(author, permlink, weight, 0)
    }
}

const reactToIncomingComments = (commentData) => {
    // console.log(commentData)
    const {author, permlink, parent_author} = commentData
    // проверяем входит ли проголосовавший аккаунт в список аккаунтов, за которые бот должен голосовать автономно
    const isApprovedAuthor = botState.accountPostsToUpvote.includes(author)
    // в блокчейне операция "comment" обозначает как посты, так и комментарии
    // у постов parent_author равняется пустой строке
    const isPost = parent_author === ''
    // задаем вес голоса по умолчанию
    const defaultWeight = 10000
    // задаем время для голосования по умолчанию через 15 минут после публикации
    const defaultDelay = 15 * 60 * 1000
    if (isApprovedAuthor && isPost) {
        console.log(`Обнаружено соответствие правилу автономного голосования: ${author} опубликовал ${permlink}`)
        checkStateAndUpvotePost(author, permlink, defaultWeight, defaultDelay)
    }
}

const selectOpHandler = (op) => {
    // используем destructuring, очень удобную фичу EcmaScript2016
    // это, конечно, не паттерн метчинг Elixir или Elm, но все равно сильно помогает улучшить читаемость кода
    const [opType, opData] = op
    if (opType === 'vote') {
        reactToIncomingVotes(opData)
    }
    else if (opType === 'comment') {
        reactToIncomingComments(opData)
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
            // forEach используется для указания того, что результатом применения функции является side effect
                .forEach(selectOpHandler) // передаем функцию, которая определит, что делать с каждым элементом
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
    // даем возможность закончить http запрос state_manager.js,
    .delay(3000) // delay -- метод библиотеки bluebird, не включен в стандарт Promise
    .then(pluckBlockHeight)
    .then(startFetchingBlocks)
    .catch(e => console.log(e))
