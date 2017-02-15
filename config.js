const operatorAccountName = process.env.GOLOS_OPERATOR_ACCOUNT // аккаунт оператора бота
// const operatorPostingKey = '5K...' //  альтернативный вариант: вводим приватный ключ прямо в код
const operatorPostingKey = process.env.GOLOS_POSTING_KEY // предпочтительный вариант: используем environment variable для доступа к приватному постинг ключу
// нам нужна  ссылка на raw gist, запрос к которой возвращает только текст внутри gist-а (без HTML страницы github)
const accountsToUpvoteGistUrl = process.env.GOLOS_ACCOUNTS_TO_UPVOTE_GIST_URL
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Object_initializer
// используем кратку форму записи объектов, где property равняется переменной, а value ES2015
module.exports = {operatorAccountName, operatorPostingKey, accountsToUpvoteGistUrl}


