// Configurações iniciais
const margin = { top: 10, right: -20, bottom: 100, left: 120 };
const barWidth = 30;
const barPadding = 5;

// Calcula as dimensões com base na largura da tela
const totalWidth = window.innerWidth;
const width = totalWidth * 0.6; // 60% da tela para o mapa
const height = 670;
const widthBars = totalWidth * 0.4 - margin.left - margin.right; // 40% para os gráficos de barra, subtraindo as margens
const heightBars = 220;

const body = d3.select("body").style("background-color", "rgb(255,255,255)");
body.style("background", "linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(230,229,246,1) 100%)");

const div0 = d3.select("body").append("div").attr("class", "title");
div0
  .append("h1")
  .text("Reservas Aéreas no Mundo")
  .style("font-family", "sans-serif")
  .style("font-size", "24px")
  .style("font-weight", "bold")
  .style("color", "black")
  .style("text-align", "center");

const div1 = d3.select("body").append("div").attr("class", "conteiner");

const div2 = d3.select(".conteiner").append("div").attr("class", "map");
const div3 = d3.select(".conteiner").append("div").attr("class", "bar-plots");

// Cria o SVG para o mapa
const svg = d3
  .select(".map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);
const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", zoomed);
svg.call(zoom);
svg.on("dblclick.zoom", null);

function zoomed(event) {
  g.selectAll("path").attr("transform", event.transform);
}

const resetButton = d3
  .select(".map")
  .append("button")
  .text("Reset Zoom")
  .style("position", "absolute")
  .style("top", "670px")
  .style("left", "500px")
  .style("font-size", "16px")
  .style("font-weight", "bold")
  .style("color", "black")
  .style("background-color", "white")
  .style("border", "2px solid black")
  .style("padding", "10px 20px")
  .style("cursor", "pointer")
  .on("click", resetZoom);

function resetZoom() {
  svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
}

const projection = d3
  .geoMercator()
  .scale(140)
  .translate([width / 2.16, height / 1.4]);
const path = d3.geoPath(projection);
const g = svg.append("g");

const tooltip = d3
  .select(".map")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("background-color", "white")
  .style("padding", "8px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "4px");

d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(
  (worldData) => {
    d3.csv("customer_booking.csv").then((reservationData) => {
      const reservationsByCountry = {};

      reservationData.forEach((d) => {
        const country = d.booking_origin;
        reservationsByCountry[country] =
          (reservationsByCountry[country] || 0) + 1;
      });

      const colorPalette = d3.interpolateGnBu;

      const colorScale = d3
        .scaleSequentialLog(colorPalette)
        .domain([1, d3.max(Object.values(reservationsByCountry))]);

      g.selectAll("path")
        .data(topojson.feature(worldData, worldData.objects.countries).features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", (d) => {
          const country = d.properties.name;
          const reservations = reservationsByCountry[country];
          return reservations ? colorScale(reservations) : "gray";
        })
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .on("mouseover", function (event, d) {
          const country = d.properties.name;
          const reservations = reservationsByCountry[country] || 0;
          tooltip
            .html(
              `<strong>Country:</strong> ${country}<br><strong>Reservations:</strong> ${
                reservations > 0 ? reservations : "No data available"
              }`
            )
            .style("visibility", "visible")
            .style("top", event.pageY - 10 + "px")
            .style("left", event.pageX + 10 + "px");
        })
        .on("mouseout", function () {
          tooltip.style("visibility", "hidden");
        })
        .on("click", function (event, d) {
          const country = d.properties.name;

          if (!reservationsByCountry[country]) {
            return;
          }
          highlightCountry(event, d, reservationsByCountry, colorScale);
          updateAllBarPlots(reservationData, country);
        })
        .on("dblclick", function (event, d) {
          removeHighlight(reservationsByCountry, colorScale);
          updateAllBarPlots(reservationData);
        });

        const legend = svg.append('g')
    .attr('transform', 'translate(25,420)');

    const legendScale = d3.scaleLog()
    .base(10) // Especifica a base do logaritmo
    .domain([1, d3.max(Object.values(reservationsByCountry))])
    .range([0, 180]);

const legendAxis = d3.axisRight(legendScale)
    .tickSize(20)
    .tickValues([1, 10, 100, 1000, 10000])
    .tickFormat(d3.format('.0f'));
legend.append('g')
    .attr('class', 'legendAxis')
    .call(legendAxis);

const rectHeight = 6; // Altura dos retângulos na legenda
const rectSpacing = -1.04; // Espaçamento entre os retângulos

// Adiciona os retângulos à legenda
legend.selectAll('.legendRect')
    .data(legendScale.ticks(8).slice(1))
    .enter().append('rect')
    .attr('class', 'legendRect')
    .attr('x', 0)
    .attr('y', (d, i) => i * (rectHeight + rectSpacing)) // Calcula a posição vertical baseada no índice
    .attr('width', 20)
    .attr('height', rectHeight)
    .style('fill', d => colorScale(d));

legend.append('text')
.attr('x', -25)
.attr('y', -15)
.text('Nº of Reservations')
.attr('font-family', 'sans-serif')
.style('font-size', '12px')
.style('font-weight', 'bold')
.style('fill', 'black');



      setupBarPlots(reservationData); // Call this function initially to setup the bar plots.
    });
  }
);





function setupBarPlots(data) {
  const features = [
    "num_passengers",
    "wants_extra_baggage",
    "wants_preferred_seat",
  ];
  features.forEach((feature, index) => {
    const barPlotData = groupDataByFeature(data, feature);
    renderBarPlot(`#bar-plot-${index + 1}`, barPlotData, feature);
  });
}

function updateAllBarPlots(data, country = null) {
  const filteredData = country
    ? data.filter((d) => d.booking_origin === country)
    : data;
  const features = [
    "num_passengers",
    "wants_extra_baggage",
    "wants_preferred_seat",
  ];
  features.forEach((feature, index) => {
    const barPlotData = groupDataByFeature(filteredData, feature);
    updateBarPlot(`#bar-plot-${index + 1}`, barPlotData);
  });
}

function groupDataByFeature(data, feature) {
  const countByFeature = {
    Sun: 0,
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
  };
  data.forEach((d) => {
    if (d[feature] === "1") {
      const flight_day = d.flight_day;
      countByFeature[flight_day] = (countByFeature[flight_day] || 0) + 1;
    }
  });
  return countByFeature;
}

function renderBarPlot(selector, data, feature) {
  const flight_day = Object.values(data);
  const barPlotWidth = flight_day.length * (barWidth + barPadding + 20);
  const yMax = d3.max(flight_day) || 1; // Garante que o eixo Y sempre tenha pelo menos uma escala
  const yScale = d3
    .scaleLinear()
    .domain([0, yMax])
    .range([heightBars - margin.bottom, margin.top]);

  const xScale = d3
    .scaleBand()
    .domain(Object.keys(data))
    .range([0, barPlotWidth])
    .padding(0.1);

  const svg = d3
    .select(selector)
    .append("svg")
    .attr("width", barPlotWidth + margin.left + margin.right + 20)
    .attr("height", heightBars);

  const barGroup = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 30)`);

  barGroup
    .selectAll("rect")
    .data(flight_day)
    .enter()
    .append("rect")
    .attr("class", "rect-bar-plot")
    .attr("x", (d, i) => xScale(Object.keys(data)[i]))
    .attr("y", (d) => yScale(d))
    .attr("width", xScale.bandwidth())
    .attr("height", (d) => heightBars - margin.bottom - yScale(d));

  if (feature === "num_passengers") {
    barGroup.attr("fill", "#1E515A");
  } else if (feature === "wants_extra_baggage") {
    barGroup.attr("fill", "#14363C");
  } else {
    barGroup.attr("fill", "#0A1B1E");
  }

  const xAxis = d3.axisBottom(xScale);

  barGroup
    .append("g")
    .attr("transform", `translate(0, ${heightBars - margin.bottom})`)
    .call(xAxis);

  const yAxis = d3.axisLeft(yScale).ticks(5);
  barGroup.append("g").attr("class", "y-axis").call(yAxis);

  const titles = {
    num_passengers: "Number of Passengers",
    wants_extra_baggage: "Wants Extra Baggage",
    wants_preferred_seat: "Wants Preferred Seat",
  };

  svg
    .append("text")
    .attr("x", barPlotWidth / 2 + margin.left)
    .attr("y", 20)
    .attr("font-family", "sans-serif")
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text(`${titles[feature]}`);

    // y-axis label
    svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 55)
    .attr("x", 0 - (heightBars / 2 - 10))
    .attr("dy", "1em")
    .attr("font-family", "sans-serif")
    .style("font-size", "10px")
    .style("text-anchor", "middle")
    .text("Reservations");

    // x-axis label
    svg
    .append("text")
    .attr("y", heightBars - 40)
    .attr("x", barPlotWidth / 2 + margin.left)
    .attr("dy", "1em")
    .attr("font-family", "sans-serif")
    .style("font-size", "10px")
    .style("text-anchor", "middle")
    .text("Flight Day");
}

function updateBarPlot(selector, data) {

  const flight_day = Object.values(data);
  const yMax = d3.max(flight_day) || 1; // Garante que o eixo Y sempre tenha pelo menos uma escala
  const yScale = d3
    .scaleLinear()
    .domain([0, yMax])
    .range([heightBars - margin.bottom, margin.top]);

  const barGroup = d3.select(selector).select("svg").select("g");

  barGroup
    .selectAll("rect")
    .data(flight_day)
    .transition()
    .duration(1000)
    .attr("y", (d) => yScale(d))
    .attr("height", (d) => heightBars - margin.bottom - yScale(d));

  const yAxis = d3.axisLeft(yScale).ticks(5);
  barGroup.select(".y-axis").transition().duration(1000).call(yAxis);
}

function highlightCountry(event, d, data, colorScale) {
  g.selectAll(".country").attr("fill", "gray");
  d3.select(event.target).attr("fill", colorScale(data[d.properties.name]));
}

function removeHighlight(data, colorScale) {
  g.selectAll(".country").attr("fill", (d) => {
    const country = d.properties.name;
    const reservations = data[country];
    return reservations ? colorScale(reservations) : "gray";
  });
}
