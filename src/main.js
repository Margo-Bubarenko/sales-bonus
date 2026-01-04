/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */

function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  const { discount, sale_price, quantity } = purchase;

  if (sale_price == null || quantity == null) {
    throw new Error("Некорректные данные покупки");
  }

  if (sale_price < 0 || quantity <= 0) {
    throw new Error("Некорректные данные цены или количества");
  }

  if (discount < 0 || discount > 100) {
    throw new Error("Некорректные данные скидки");
  }

  const decimalDiscount = discount / 100;

  const fullPrice = sale_price * quantity;

  const revenueWithDiscount = fullPrice * (1 - decimalDiscount);

  return revenueWithDiscount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  if (total <= 0) return 0;
  if (index < 0 || index >= total) return 0;

  const { profit } = seller;

  if (index === 0) {
    return Math.round(profit * 0.15 * 100) / 100;
  } else if (index === 1 || index === 2) {
    return Math.round(profit * 0.1 * 100) / 100;
  } else if (index === total - 1) {
    return 0;
  } else {
    return Math.round(profit * 0.05 * 100) / 100;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных

  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  // @TODO: Проверка наличия опций

  if (typeof options !== "object" || options === null) {
    throw new Error("options должен быть объектом");
  }

  const { calculateRevenue, calculateBonus } = options;

  if (calculateRevenue === undefined || calculateBonus === undefined) {
    throw new Error(
      "В options должны быть определены функции calculateRevenue и calculateBonus"
    );
  }

  // Опциональная проверка, что переменные — это функции
  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("calculateRevenue и calculateBonus должны быть функциями");
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const { sellers, products, purchase_records } = data;

  const sellerStats = {};

  sellers.forEach((seller) => {
    sellerStats[seller.id] = {
      seller_id: seller.id,
      name: `${seller.first_name} ${seller.last_name}`,
      revenue: 0,
      profit: 0,
      sales_count: 0,
      products_sold: {},
    };
  });

  // @TODO: Индексация продавцов и товаров для быстрого доступа

  const productsStats = {};

  products.forEach((product) => {
    productsStats[product.sku] = product;
  });

  purchase_records.forEach((record) => {
    const seller = sellerStats[record.seller_id];

    if (!seller) {
      console.warn(`Продавец с id ${record.seller_id} не найден`);
      return;
    }

    // Увеличить количество продаж на 1
    seller.sales_count += 1;

    seller.revenue += record.total_amount;

    // Расчёт прибыли для каждого товара в чеке
    record.items.forEach((item) => {
      const product = productsStats[item.sku];

      if (!product) {
        console.warn(`Товар с sku ${item.sku} не найден`);
        return;
      }

      // Посчитать себестоимость товара
      const cost = product.purchase_price * item.quantity;

      // Посчитать выручку с учётом скидки через функцию calculateRevenue
      const revenue = options.calculateRevenue(item, product);

      // Прибыль: выручка минус себестоимость
      seller.profit += revenue - cost;

      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }

      seller.products_sold[item.sku] =
        (seller.products_sold[item.sku] || 0) + item.quantity;
    });
  });

  // @TODO: Сортировка продавцов по прибыли
  const result = Object.values(sellerStats).sort((a, b) => b.profit - a.profit);

  // @TODO: Подготовка итоговой коллекции с нужными полями
  result.forEach((seller, index) => {
    seller.bonus = options.calculateBonus(index, result.length, seller);

    seller.top_products = Object.entries(seller.products_sold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sku, quantity]) => ({ sku, quantity }));

    delete seller.products_sold;

    seller.revenue = +seller.revenue.toFixed(2);
    seller.profit = +seller.profit.toFixed(2);
    seller.bonus = +seller.bonus.toFixed(2);
  });

  return result;
}