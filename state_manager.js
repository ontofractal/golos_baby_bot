const config = require('./config.js')
const golos = require('golos') // импортируем модуль голоса
const request = require('request')
// используем destructuring
const {operatorAccountName, accountsToUpvoteGistUrl} = config
let accountPostsToUpvote = []


// управление и обновление списка аккаунтов, чьи голоса бот должен копировать
// может быть настроено аналогично
const accountVotesToCopy = process.env.GOLOS_ACCOUNT_VOTES_TO_FOLLOW.split(',')
console.log(`Бот будет повторять голоса следующих аккаунтов: ${accountVotesToCopy}`)

const botState = {accountPostsToUpvote, accountVotesToCopy}

const updateAccountPostsToUpvoteFromGist = function () {
    request(accountsToUpvoteGistUrl, (error, response, body) => {
        // если http запрос не будет успешным, то список не обновится до следующего вызова функции
        if (!error && response.statusCode === 200) {
            console.log(`Успешно обновлен список аккаунтов для автономного голосования: ${body}`)
            botState.accountPostsToUpvote = body.split(',') // используем closure для мутации botState
        }
    })
}

const updateAccountPostsToUpvoteFromFollowings = function () {
    // первый параметр: имя аккаунта,
    // второй параметр является курсором хоть так и не называется
    // в данном случае указывает с какого фолловинга начинать отсчет (по алфавитному порядку)
    // третий параметр: тип фолловинга, в этом случае 'blog'
    // четвертый  параметр: запрашиваемое количество элементов в списке, не больше 100
    golos.api.getFollowings(operatorAccountName, '', 'blog',  100, (err, result) => {
        if (err) {
            console.log("Во время JSONRPC вызова getFollosing произошла ошибка. ")
            console.log(err)
        } else {
            const followings = result.map(x => x.following)
            console.log(`Успешно обновлен список аккаунтов для автономного голосования: ${followings}`)
            botState.accountPostsToUpvote = followings // используем closure для мутации botState
        }
    })
}

// при импортировании файла во время require('./state_manager') в main.js следующие функции будут автоматически вызываны
// для использования фолловингов в качестве списка для автономного голосования следует
// заменить updateAccountPostsToUpvote на функцию updateAccountPostsToUpvoteFromFollowings
updateAccountPostsToUpvoteFromGist()
setInterval(updateAccountPostsToUpvoteFromGist, 30 * 60 * 1000)

module.exports = botState

