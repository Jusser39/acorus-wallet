export type Dictionary = Record<string, string>;

export const en: Dictionary = {
  // Navigation
  "nav.explore": "Explore",
  "nav.swap": "Swap",
  "nav.send": "Send",
  "nav.receive": "Receive",
  "nav.settings": "Settings",
  "nav.security": "Security",
  "nav.wallet": "Wallet",

  // Settings
  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.language.desc": "Choose your preferred language.",
  "settings.currency": "Display Currency",
  "settings.currency.desc": "Choose your preferred fiat currency for displaying prices and balances.",
  "settings.theme": "Theme",
  "settings.theme.desc": "Choose between light and dark mode.",

  // Tokens
  "token.market_cap": "Market cap",
  "token.fdv": "FDV",
  "token.volume_24h": "24h volume",
  "token.liquidity": "Liquidity",
  "token.high_24h": "24h high",
  "token.low_24h": "24h low",
  "token.launch_date": "Launch date",
  "token.rank": "Rank",
  "token.circulating_supply": "Circulating supply",
  "token.total_supply": "Total supply",
  "token.max_supply": "Max supply",
  "token.categories": "Categories",
  "token.about": "About",
  "token.trade": "Trade this token",
  "token.receive": "Receive",
  "token.price": "Price",

  // Swap
  "swap.title": "Swap",
  "swap.review": "Review Swap",

  // General
  "general.search": "Search...",
  "general.copied": "Copied",
  "general.failed": "Copy failed",
  "general.share": "Share",
  "general.copy_address": "Copy address",
  "general.blockchain": "Blockchain",
  "general.no_data": "No price data.",
};

export const ru: Dictionary = {
  // Navigation
  "nav.explore": "Обзор",
  "nav.swap": "Обмен",
  "nav.send": "Отправить",
  "nav.receive": "Получить",
  "nav.settings": "Настройки",
  "nav.security": "Безопасность",
  "nav.wallet": "Кошелек",

  // Settings
  "settings.title": "Настройки",
  "settings.language": "Язык",
  "settings.language.desc": "Выберите предпочитаемый язык.",
  "settings.currency": "Валюта отображения",
  "settings.currency.desc": "Выберите основную фиатную валюту для цен и балансов.",
  "settings.theme": "Тема",
  "settings.theme.desc": "Выберите светлую или темную тему оформления.",

  // Tokens
  "token.market_cap": "Рыночная капитализация",
  "token.fdv": "FDV (Полная разводненная оценка)",
  "token.volume_24h": "Объем (24ч)",
  "token.liquidity": "Ликвидность",
  "token.high_24h": "Макс (24ч)",
  "token.low_24h": "Мин (24ч)",
  "token.launch_date": "Дата запуска",
  "token.rank": "Рейтинг",
  "token.circulating_supply": "В обращении",
  "token.total_supply": "Общее предложение",
  "token.max_supply": "Макс. предложение",
  "token.categories": "Категории",
  "token.about": "О проекте",
  "token.trade": "Торговать этот токен",
  "token.receive": "Получить",
  "token.price": "Цена",

  // Swap
  "swap.title": "Обмен",
  "swap.review": "Проверить обмен",

  // General
  "general.search": "Поиск...",
  "general.copied": "Скопировано",
  "general.failed": "Ошибка копирования",
  "general.share": "Поделиться",
  "general.copy_address": "Скопировать адрес",
  "general.blockchain": "Блокчейн",
  "general.no_data": "Нет данных о цене.",
};

export const dictionaries: Record<string, Dictionary> = {
  en,
  ru,
};
