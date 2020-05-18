const socket = io('wss://le-18262636.bitzonte.com', {
  path: '/stocks'
});

google.charts.load('current', {packages: ['corechart', 'line']});

var stocksBD = {};
var exchangesBD = {
  Total: 0
};
var stockExchange = {}
var chartdata;
var chart
var options = {
  hAxis: {
    title: 'Time',
    format: 'hh:mm:ss',
    color: '#D7D0D0',
    textStyle: {
      color: '#D7D0D0'
    },
    titleTextStyle: {
            color: '#D7D0D0',
          }
  },
  vAxis: {
    title: 'Value',
    color: '#D7D0D0',
    textStyle: {
      color: '#D7D0D0'
    },
    titleTextStyle: {
            color: '#D7D0D0',
          }
  },
  legend: {
    textStyle: {
      color: '#D7D0D0'
    }},
  backgroundColor: '#000000'
};
var currentStock = ""

function appendExchange(exchange){
  var exchangeRow = $('<tr/>', {
    class: exchange['exchange_ticker'],
  });
  exchangeRow.append('<td id="exchange">' + exchange['exchange_ticker'] + '</td>');
  exchangeRow.append('<td id="buy">' + exchange['buyVolume'] + '</td>');
  exchangeRow.append('<td id="sell">' + exchange['sellVolume'] + '</td>');
  exchangeRow.append('<td id="total">' + exchange['totalVolume'] + '</td>');
  exchangeRow.append('<td id="number">' + exchange['numberStocks'] + '</td>');
  exchangeRow.append('<td id="market">' + 0 + '</td>');
  $('#exchangeTable > tbody:last-child').append(exchangeRow);

  var exchangeInfoRow = $('<tr/>', {
    class: exchange['exchange_ticker'],
  });
  exchangeInfoRow.append('<td>' + exchange['exchange_ticker'] + '</td>');
  exchangeInfoRow.append('<td>' + exchange['name'] + '</td>');
  exchangeInfoRow.append('<td>' + exchange['country'] + '</td>');
  exchangeInfoRow.append('<td>' + exchange['address'] + '</td>');
  $('#exchangeInfo > tbody:last-child').append(exchangeInfoRow);
}

function appendStock(stock) {
  var buttonStock = $('<input/>',
  {
      type: 'button',
      value: stock,
      click: function () {
        if(currentStock){
            $('.'+exchangesBD[stockExchange[stocksBD[currentStock]['company_name']]]['exchange_ticker']).css("background-color", 'black')
        }

        currentStock = this.value;
        $('#stockName').text(stocksBD[this.value]['company_name']);
        $('#stockValues').replaceWith('<tr id="stockValues"><td>' + this.value + '</td>><td>' + stocksBD[this.value]['totalVol'] + '</td><td>' + stocksBD[this.value]['historicH'] + '</td><td>' + stocksBD[this.value]['historicL'] + '</td><td>' + stocksBD[this.value]['lastPrice'] + '</td><td>' + stocksBD[this.value]['var'] + '</td></tr>');
        $('#quote_base').text('Currency: '+ stocksBD[this.value]['quote_base'])
        $('.'+exchangesBD[stockExchange[stocksBD[this.value]['company_name']]]['exchange_ticker']).css("background-color", '#255AE8')

        chartdata = new google.visualization.DataTable();
        chartdata.addColumn('date', 'Time');
        chartdata.addColumn('number', 'Price');
        chartdata.addRows(stocksBD[this.value]['prices']);

        chart = new google.visualization.LineChart(document.getElementById('lineChart'));
        chart.draw(chartdata, options);
      },
  });
  $(".listStocks").append(buttonStock);
}

function updateStock(stock, data, type){
  if(type === "price"){
    let date = new Date(data.time)
    stock['prices'].push([date, data.value])
    stock['historicH'] = ((stock['historicH'] < data.value) ? data.value : stock['historicH'])
    stock['historicL'] = ((stock['historicL'] > data.value) ? data.value : stock['historicL'])
    stock['var'] = (100*(data.value - stock['lastPrice'])/stock['lastPrice']).toFixed(2);
    stock['lastPrice'] = data.value;
  } else {
      if (type === "buy") {
        stock['buys'] += data.volume
      } else {
        stock['sells'] += data.volume
      }
      stocksBD[stock.ticker]['totalVol'] += data.volume
  }
}

function updateExchange(exchange, data, type){
  exchangesBD['Total'] += data.volume;
  exchange['totalVolume'] += data.volume
  $('.' + exchange['exchange_ticker'] + ' > #total').text(exchange['totalVolume'])
  if(type === "buy"){
    exchange['buyVolume'] += data.volume
    $('.' + exchange['exchange_ticker'] + ' > #buy').text(exchange['buyVolume'])
  } else {
    exchange['sellVolume'] += data.volume
    $('.' + exchange['exchange_ticker'] + ' > #sell').text(exchange['sellVolume'])
  }
  let exchs = Object.keys(exchangesBD)
  exchs.forEach((exch, i) => {
    if(exch !== "Total"){
        $('.' + exchangesBD[exch]['exchange_ticker'] + ' > #market').text(exchangesBD[exch]['marketShare']())
    }
  })
}

$(document).ready(function(){

  $(".connect").click(function(){
    let value = this.value;
    if(value === "Disconnect"){
      socket.disconnect()
      $(".connect").val("Connect");
    } else {
      socket.connect()
      $(".connect").val("Disconnect");
    }
  });

  socket.on('EXCHANGES', (data) => {
    let exchanges = Object.keys(data)
    exchanges.forEach((exchange, i) => {
      if(!(exchange in exchangesBD)){
        data[exchange]['listed_companies'].forEach((company_name, i) => {
          stockExchange[company_name] = exchange
        });
        exchangesBD[exchange] = data[exchange]
        exchangesBD[exchange]['buyVolume'] = 0;
        exchangesBD[exchange]['sellVolume'] = 0;
        exchangesBD[exchange]['totalVolume'] = 0;
        exchangesBD[exchange]['numberStocks'] = exchangesBD[exchange]['listed_companies'].length;
        exchangesBD[exchange]['marketShare'] = function(){return (100*(exchangesBD[exchange]['totalVolume']/exchangesBD['Total'])).toFixed(2)}
        appendExchange(exchangesBD[exchange])
      }

    });

  });

  socket.on('STOCKS', (data) => {
    data.forEach((stock, i) => {
      if(!(stock.ticker in stocksBD)){
        stocksBD[stock.ticker] = stock;
        stocksBD[stock.ticker]['prices'] = []
        stocksBD[stock.ticker]['totalVol'] = 0
        stocksBD[stock.ticker]['historicH'] = Number.NEGATIVE_INFINITY;
        stocksBD[stock.ticker]['historicL'] = Number.POSITIVE_INFINITY;
        stocksBD[stock.ticker]['lastPrice'] = undefined;
        stocksBD[stock.ticker]['var'] = 0;
        stocksBD[stock.ticker]['buys'] = 0;
        stocksBD[stock.ticker]['sells'] = 0;
        appendStock(stock.ticker);
      }
    });
  });

  socket.on('connect', () => {
      socket.emit("EXCHANGES");
      socket.emit("STOCKS");
      $("#statusD").hide();
      $("#statusC").show();
      $(".connect").val("Disconnect");
  });

  socket.on('disconnect', () => {
      $("#statusD").show();
      $("#statusC").hide();
      $(".connect").val("Connect");
  });

  socket.on('UPDATE', (data) => {
    if(Object.keys(stocksBD).length !== 0){
      updateStock(stocksBD[data.ticker], data, 'price')

      if(data.ticker === currentStock){
        let date = new Date(data.time)
        chartdata.addRow([date, data.value])
        chart.draw(chartdata, options);
        $('#stockValues').replaceWith('<tr id="stockValues"><td>' + data.ticker + '</td>><td>' + stocksBD[data.ticker]['totalVol'] + '</td><td>' + stocksBD[data.ticker]['historicH'] + '</td><td>' + stocksBD[data.ticker]['historicL'] + '</td><td>' + stocksBD[data.ticker]['lastPrice'] + '</td><td>' + stocksBD[data.ticker]['var'] + '</td></tr>');
      }
    }
  });

  socket.on('BUY', (data) => {
    if(Object.keys(stocksBD).length !== 0){
      updateStock(stocksBD[data.ticker], data, 'buy')
      updateExchange(exchangesBD[stockExchange[stocksBD[data.ticker]['company_name']]], data, 'buy')
    }

    if(data.ticker === currentStock){
      $('#stockValues').replaceWith('<tr id="stockValues"><td>' + data.ticker + '</td>><td>' + stocksBD[data.ticker]['totalVol'] + '</td><td>' + stocksBD[data.ticker]['historicH'] + '</td><td>' + stocksBD[data.ticker]['historicL'] + '</td><td>' + stocksBD[data.ticker]['lastPrice'] + '</td><td>' + stocksBD[data.ticker]['var'] + '</td></tr>');
    }
  });

  socket.on('SELL', (data) => {
    if(Object.keys(stocksBD).length !== 0){
      updateStock(stocksBD[data.ticker], data, 'sell')
      updateExchange(exchangesBD[stockExchange[stocksBD[data.ticker]['company_name']]], data, 'sell')
    }

    if(data.ticker === currentStock){
      $('#stockValues').replaceWith('<tr id="stockValues"><td>' + data.ticker + '</td>><td>' + stocksBD[data.ticker]['totalVol'] + '</td><td>' + stocksBD[data.ticker]['historicH'] + '</td><td>' + stocksBD[data.ticker]['historicL'] + '</td><td>' + stocksBD[data.ticker]['lastPrice'] + '</td><td>' + stocksBD[data.ticker]['var'] + '</td></tr>');
    }
  });

});
