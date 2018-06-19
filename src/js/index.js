import $ from 'jquery';
(function() {
    /* global window, document */
    'use strict';

    let SMD = window.SMD || {};

    SMD.financeTracker = {
        chart: null,
        chartInner: null,
        chartWidth: 600,
        chartHeight: 360,
        chartLegendText: "Figures are in £ billions",
        init: function () {

            this.chart = document.getElementById('financeTracker');
            if (!this.chart) { return; }

            // Group - chart
            let chartGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            chartGroup.setAttribute('class', 'ft-group-chart');
            chartGroup.setAttribute('transform', 'translate(20 0)');
            this.chart.appendChild(chartGroup);
            this.chartInner = chartGroup;

            // draw chart
            this.drawSVG();

            //add legend
            let legendNode = document.createElement('small');
            legendNode.textContent = this.chartLegendText;
            let chartEmbed = this.chart.parentNode;
            let parentElem = chartEmbed.parentNode;
            parentElem.insertBefore(legendNode, chartEmbed);

            // event binding
            let yearSelector = document.querySelector('.js-ft-chart-select');

            if (!yearSelector) { return; }

            yearSelector.addEventListener('change', function (e) {
                let selectedYear = e.target.value;
                SMD.financeTracker.cleanupSVG();
                SMD.financeTracker.drawSVG(selectedYear);
            });

        },
        cleanupSVG: function () {
            // remove svg groups to allow redraw
            let svgTargetGroup = document.querySelector('.ft-group-target');
            let svgChartGroup = document.querySelector('.ft-group-chart');

            if (svgTargetGroup) {
                SMD.financeTracker.chart.removeChild(svgTargetGroup);
            }

            if (svgChartGroup) {

                for (let i = svgChartGroup.childNodes.length - 1; i >= 0; i--) {
                   svgChartGroup.removeChild(svgChartGroup.childNodes[i]);
                }
            }
        },
        drawSVG: function (selectedYear) {

            //get data - temporarily from inline script block on page - output from cms
            let yearData = SMD.financeTrackerData;

            if (yearData === null || yearData === undefined) {
                return;
            }

            // get selected year or use latest
            if (selectedYear) {

                yearData = yearData.filter(function (data) {
                    return data.year === parseInt(selectedYear, 10);
                });

            }

            yearData = yearData[0];

            // calculate data
            let chartData = SMD.financeTracker.getChartData(yearData);
            let chartYear = yearData.year;
            let financeTarget = yearData.target;
            let financeOffset = yearData.offset;

            // plot chart target
            SMD.financeTracker.plotChartTarget(chartData, financeTarget, financeOffset);

            // plot chart quarters
            SMD.financeTracker.plotChartQuarters(chartData, chartYear);

            // plot chart data
            SMD.financeTracker.plotChartData(chartData);

        },
        getValueArray: function (data) {

            return data.map(function (item) {
                return item.value;
            });

        },
        getChartData: function (data) {

            // Add origin to chart
            if (data.dataPoints.length < 5) {
                let dataOrigin = {
                    label: 'start',
                    value: 0
                };
                data.dataPoints.unshift(dataOrigin);
            }

            let values = SMD.financeTracker.getValueArray(data.dataPoints);

            return SMD.financeTracker.getCoordinates(values, data.target);

        },
        getCoordinates: function (values, financeTarget) {

            let minValue = Math.floor(Math.min.apply( null, values ) * 1);
            let maxValue = Math.ceil(Math.max.apply( null, values ) * 1);
            let min = 0;
            let max = financeTarget * 2; // double target

            //handle negative values
            if (minValue < min) {
                min = minValue * 2; //*2 so it has space for label below
            }

            if (maxValue > max) {
                max = maxValue;
            }

            let yRatio = (max - min) / this.chartHeight;
            let xRatio = this.chartWidth / (values.length - 1);

            return values.map(function(value, i) {
                let y = SMD.financeTracker.chartHeight - ((value - min) / yRatio);
                let x = ( xRatio * i );
                return [x, y, value];
            });
        },
        getLineSVG: function (data) {

            // D3 for smooth line
            // let lineGenerator = d3.line()
            //     .x(function (d) {
            //         return d[0];
            //     })
            //     .y(function (d) {
            //         return d[1];
            //     })
            //     .curve(d3.curveCardinal);
            // return lineGenerator(filteredData);

            // remove null values
            let filteredData = data.filter(function (dataPoint) {
                return dataPoint[2] !== null;
            });

            let lineData = '';
            filteredData.map(function(coordinates, i){
                let command = i === 0 ? 'M' : 'L';
                lineData = lineData + ' ' + command + ' ' + coordinates[0] + ',' + coordinates[1];
            });
            return lineData;

        },
        plotChartData: function (chartData) {

            // Filter data to remove null and 0 values
            let filteredchartData = chartData.filter(function (coordinate) {
                return coordinate[2] !== null && coordinate[2] !== 0;
            });

            // Group - data
            let dataGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            dataGroup.setAttribute('class', 'ft-group-datapoints');
            this.chartInner.appendChild(dataGroup);

            // Plot data line
            let dataLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            let dataLineLength;
            dataLine.setAttribute('class', 'ft-dataline');
            dataLine.setAttribute('style', 'animation-duration:' + (filteredchartData.length * 0.3) + 's;');
            dataLine.setAttribute('d', SMD.financeTracker.getLineSVG(chartData));
            dataLineLength = dataLine.getTotalLength();
            dataLine.setAttribute('stroke-dasharray', dataLineLength);
            dataLine.setAttribute('stroke-dashoffset', dataLineLength);
            setTimeout(() => {
                dataLine.setAttribute('class', 'ft-dataline ft-dataline--in');
            }, 1000);
            dataGroup.appendChild(dataLine);

            // Plot data points
            filteredchartData.map(function(coordinates) {

                // let dataPointClass = '';
                // let offsetUpper = financeTarget + financeoffset;
                // let offsetLower = financeTarget - financeoffset;
                // set class on points depending if on target or in range
                // if (coordinates[2] < offsetLower || coordinates[2] > offsetUpper) {
                //     dataPointClass = 'ft--off-target';
                // } else {
                //     dataPointClass = 'ft--on-target';
                // }

                // Group - datapoints
                let dataGroupPoint = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                dataGroupPoint.setAttribute('class', 'ft-group-datapoint');
                dataGroup.appendChild(dataGroupPoint);

                // Point - outer
                let pointOuter = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                pointOuter.setAttribute('class', 'ft-datapoint-outer');
                pointOuter.setAttribute('cx', coordinates[0]);
                pointOuter.setAttribute('cy', coordinates[1]);
                pointOuter.setAttribute('r', 6);
                dataGroupPoint.appendChild(pointOuter);

                // Point - inner
                let pointInner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                pointInner.setAttribute('class', 'ft-datapoint'); // + dataPointClasss
                // pointInner.setAttribute('data-value', coordinates[2]);
                pointInner.setAttribute('cx', coordinates[0]);
                pointInner.setAttribute('cy', coordinates[1]);
                pointInner.setAttribute('r', 3);
                dataGroupPoint.appendChild(pointInner);

                // Point - label
                let pointLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                pointLabel.setAttribute('class', 'ft-datapoint_label');// + dataPointClass
                pointLabel.setAttribute('text-anchor', 'middle');
                pointLabel.setAttribute('transform', 'translate(0 25)');
                pointLabel.setAttribute('width', 100);
                pointLabel.setAttribute('x', coordinates[0]);
                pointLabel.setAttribute('y', coordinates[1]);
                pointLabel.textContent = coordinates[2];
                // pointLabel.textContent = '£' + coordinates[2] + 'Bn';
                dataGroupPoint.appendChild(pointLabel);
            });

        },
        plotChartTarget: function (chartData, financeTarget, financeoffset) {

            let quarterWidth = this.chartWidth / (chartData.length - 1);

            // Group - Gridlines
            let dataGroupGridLines = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            dataGroupGridLines.setAttribute('class', 'ft-group-gridlines');
            this.chartInner.appendChild(dataGroupGridLines);

            // Plot gridlines
            chartData.map(function (coordinates, i){
                let gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                gridLine.setAttribute('class', 'ft-gridline');
                gridLine.setAttribute('height', SMD.financeTracker.chartHeight);
                gridLine.setAttribute('width', 1);
                gridLine.setAttribute('x', quarterWidth * (i));
                gridLine.setAttribute('y', 0);
                dataGroupGridLines.appendChild(gridLine);
            });

            // Group - Finance Target
            let dataGroupTarget = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            dataGroupTarget.setAttribute('class', 'ft-group-target');
            this.chart.insertBefore(dataGroupTarget, document.querySelector('.ft-group-chart'));

            // Plot target range
            let targetRangeTop = financeTarget + financeoffset;
            let targetRangeBottom = financeTarget - financeoffset;
            let targetRange = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            let targetRangeCoords = SMD.financeTracker.getCoordinates([targetRangeTop, targetRangeBottom], financeTarget);
            let targetRangeYMax = targetRangeCoords[0][1];
            let targetRangeYMin = targetRangeCoords[1][1];
            targetRange.setAttribute('class', 'ft-target-range');
            targetRange.setAttribute('height', targetRangeYMin - targetRangeYMax);
            targetRange.setAttribute('x', 0);
            targetRange.setAttribute('y', targetRangeYMax);
            targetRange.setAttribute('width', '100%');
            dataGroupTarget.appendChild(targetRange);

            // Plot target line
            let targetLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            let targetLineCoords = SMD.financeTracker.getCoordinates([financeTarget], financeTarget);
            let targetLineY = targetLineCoords[0][1];
            targetLine.setAttribute('class', 'ft-target-line');
            targetLine.setAttribute('x1', 0);
            targetLine.setAttribute('x2', '100%');
            targetLine.setAttribute('y1', targetLineY);
            targetLine.setAttribute('y2', targetLineY);
            dataGroupTarget.appendChild(targetLine);

            // Plot target label
            let targetLabel = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            let targetLabelPath = 'M 0 0 L 50 0 L 60 12 L 50 24 L 0 24';
            targetLabel.setAttribute('class', 'ft-target-label');
            targetLabel.setAttribute('d', targetLabelPath);
            targetLabel.setAttribute('transform', 'translate(0 ' + (targetLineY - 12) + ')');
            dataGroupTarget.appendChild(targetLabel);

            // Plot target label text
            let targetLabelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            targetLabelText.setAttribute('alignment-baseline', 'middle');
            targetLabelText.setAttribute('class', 'ft-target-label_text');
            targetLabelText.setAttribute('transform', 'translate(4 1)');
            targetLabelText.setAttribute('x', 0);
            targetLabelText.setAttribute('y', targetLineY);
            targetLabelText.textContent = '£' + financeTarget + ' Bn';
            dataGroupTarget.appendChild(targetLabelText);

            // Plot header line
            let headerLine = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            headerLine.setAttribute('class', 'ft-gridline');
            headerLine.setAttribute('height', 1);
            headerLine.setAttribute('width', '100%');
            headerLine.setAttribute('x', 0);
            headerLine.setAttribute('y', 40);
            dataGroupTarget.appendChild(headerLine);

        },
        plotChartQuarters: function (chartData, activeYear) {

            let quarterWidth = this.chartWidth / (chartData.length - 1);

            // Group - quarters
            let dataGroupQuarters = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            dataGroupQuarters.setAttribute('class', 'ft-group-quarters');
            this.chartInner.appendChild(dataGroupQuarters);

            // Plot quarters
            chartData.map(function (coordinates, i) {
                if (i === 0) {
                    return;
                }

                // Group - Specific Quarter
                let dataGroupQuarterItem = document.createElementNS('http://www.w3.org/2000/svg','g');
                let quarterClass = '';

                if (coordinates[2] === null) {
                    quarterClass += 'ft-quarter--disabled';
                } else {
                    quarterClass += 'ft-quarter--enabled';
                }

                dataGroupQuarterItem.setAttribute('class', 'ft-group-quarter ' + quarterClass);
                dataGroupQuarterItem.setAttribute('id', 'ft-group-quarter-' + i);
                dataGroupQuarterItem.setAttribute('data-content-target', activeYear + 'q' + i);
                dataGroupQuarters.appendChild(dataGroupQuarterItem);

                // Plot quarter rectangle
                let quarter = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                quarter.setAttribute('class', 'ft-quarter');
                quarter.setAttribute('height', SMD.financeTracker.chartHeight);
                quarter.setAttribute('width', quarterWidth);
                quarter.setAttribute('x', quarterWidth * (i - 1));
                quarter.setAttribute('y', 0);
                dataGroupQuarterItem.appendChild(quarter);

                // Plot quarter header
                let quarterHeader = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                quarterHeader.setAttribute('class', 'ft-quarter_header');
                quarterHeader.setAttribute('height', 40);
                quarterHeader.setAttribute('width', quarterWidth);
                quarterHeader.setAttribute('x', quarterWidth * (i - 1));
                quarterHeader.setAttribute('y', 0);
                dataGroupQuarterItem.appendChild(quarterHeader);

                // Plot quarter label
                let quarterLabelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                quarterLabelText.setAttribute('class', 'ft-quarter_label');
                quarterLabelText.setAttribute('text-anchor', 'middle');
                quarterLabelText.setAttribute('x', quarterWidth * (i - 1) + (quarterWidth / 2));
                quarterLabelText.setAttribute('y', 25);
                quarterLabelText.textContent = 'Q' + i;
                dataGroupQuarterItem.appendChild(quarterLabelText);
            });

            // Event - enabled quarter selection
            let quarters = document.querySelectorAll('.ft-quarter--enabled');
            let quarterDetails = document.querySelector('.ft-content');
            let defaultQuarter = quarters[quarters.length - 1];

            // if quarter detail content is present - i.e full interactive version
            if (quarterDetails) {
                // SMD.financeTracker.chart.classList.add('ft--interactive');
                $(SMD.financeTracker.chart).addClass('ft--interactive');

                for (let i = 0; i < quarters.length; i++) {

                    quarters[i].addEventListener('click', function (e) {
                        SMD.financeTracker.showQuarterContent(this, quarters);
                    });

                }
            }

            // select default quarter
            SMD.financeTracker.showQuarterContent(defaultQuarter, quarters);
        },
        showQuarterContent: function (selectedQuarter, quarters) {

            let activeClass = 'is-active';
            let visibleClass = 'is-visible';
            let contentPanels = document.querySelectorAll('.ft-content_quarter');
            let selectedQuarterId = selectedQuarter.getAttribute('data-content-target');
            let selectedContentPanel = document.getElementById(selectedQuarterId);

            // toggle class
            for (let i = 0; i < quarters.length; i++) {
                $(quarters[i]).removeClass(activeClass);
            }
            $(selectedQuarter).addClass(activeClass);

            // show content quarter panel
            if (selectedContentPanel) {

                for (let i = 0; i < contentPanels.length; i++) {
                    contentPanels[i].classList.remove(visibleClass);
                }

                selectedContentPanel.classList.add(visibleClass);
            }

        }
    };

    window.SMD = SMD;

    document.addEventListener('DOMContentLoaded', function () {
        SMD.financeTracker.init();
    });

})();