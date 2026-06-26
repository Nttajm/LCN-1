(function (global) {
    var chartTooltip = null;

    function normalizeSeries(series) {
        if (!series || !Array.isArray(series)) return [];
        return series.map(function (s) {
            if (typeof s === 'string') return { color: s, name: '' };
            return {
                color: s.color || s.colour || '#93c5fd',
                name: s.name || s.label || ''
            };
        });
    }

    function parseConfig(el) {
        var raw = el.getAttribute('data-chart-config');
        if (!raw) return null;
        try {
            return JSON.parse(decodeURIComponent(raw));
        } catch (e1) {
            try {
                return JSON.parse(raw);
            } catch (e2) {
                return null;
            }
        }
    }

    function encodeConfig(config) {
        return encodeURIComponent(JSON.stringify(config));
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatAxisValue(val) {
        if (Math.abs(val) < 1e-10) return '0';
        var abs = Math.abs(val);
        if (abs >= 100) return String(Math.round(val));
        if (abs >= 10) return String(Math.round(val * 10) / 10).replace(/\.0$/, '');
        if (abs >= 1) return String(Math.round(val * 10) / 10).replace(/\.0$/, '');
        if (abs >= 0.1) return String(Math.round(val * 100) / 100).replace(/\.?0+$/, '');
        return String(Math.round(val * 1000) / 1000).replace(/\.?0+$/, '');
    }

    function niceAxisStep(rough) {
        if (!isFinite(rough) || rough <= 0) return 1;
        var pow = Math.pow(10, Math.floor(Math.log10(rough)));
        if (!pow) pow = 1;
        var d = rough / pow;
        var step = d <= 1 ? 1 : d <= 2 ? 2 : d <= 5 ? 5 : 10;
        return step * pow;
    }

    function computeYScale(values, gridLines) {
        gridLines = gridLines || 5;
        var dataMax = Math.max.apply(null, values);
        if (!isFinite(dataMax) || dataMax <= 0) dataMax = 1;

        var headroom = Math.max(dataMax * 0.12, dataMax * 0.05);
        var targetMax = dataMax + headroom;
        var step = niceAxisStep(targetMax / gridLines);
        var maxVal = Math.ceil(targetMax / step) * step;

        while (maxVal < dataMax) maxVal += step;

        return { max: maxVal, step: step, gridLines: gridLines };
    }

    function generateSVG(config) {
        var data = config.data || [];
        var series = normalizeSeries(config.series || config.colors);
        var w = config.width || 600;
        var h = config.height || 350;
        var padding = { top: 30, right: 20, bottom: 50, left: 55 };
        var chartW = w - padding.left - padding.right;
        var chartH = h - padding.top - padding.bottom;
        var isGrouped = config.type === 'grouped';
        var seriesCount = 1;

        if (isGrouped && data.length > 0 && Array.isArray(data[0].values)) {
            seriesCount = data[0].values.length;
        }

        var allValues = [];
        data.forEach(function (d) {
            if (isGrouped && Array.isArray(d.values)) {
                d.values.forEach(function (v) { allValues.push(v); });
            } else {
                allValues.push(d.value || 0);
            }
        });

        var yScale = computeYScale(allValues);
        var maxVal = yScale.max;
        var barGroupWidth = chartW / data.length;
        var barGap = barGroupWidth * 0.2;
        var barWidth = (barGroupWidth - barGap) / seriesCount;
        if (barWidth > 50) barWidth = 50;

        var axisStroke = 'rgba(255,255,255,0.15)';
        var axisLabelFill = 'rgba(255,255,255,0.5)';
        var categoryFill = 'rgba(255,255,255,0.7)';
        var font = '-apple-system,BlinkMacSystemFont,sans-serif';

        var svg = '<svg class="ed-chart-svg" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">';

        var gridLines = yScale.gridLines;
        for (var g = 0; g <= gridLines; g++) {
            var yPos = padding.top + (chartH / gridLines) * g;
            var val = yScale.step * (gridLines - g);
            if (val > maxVal + 1e-10) val = maxVal;
            svg += '<line x1="' + padding.left + '" y1="' + yPos + '" x2="' + (w - padding.right) + '" y2="' + yPos + '" stroke="' + axisStroke + '" stroke-width="1"/>';
            svg += '<text x="' + (padding.left - 8) + '" y="' + (yPos + 3) + '" text-anchor="end" fill="' + axisLabelFill + '" font-family="' + font + '" font-size="10">' + formatAxisValue(val) + '</text>';
        }

        svg += '<line x1="' + padding.left + '" y1="' + (h - padding.bottom) + '" x2="' + (w - padding.right) + '" y2="' + (h - padding.bottom) + '" stroke="' + axisStroke + '" stroke-width="1"/>';

        data.forEach(function (d, i) {
            var groupX = padding.left + barGroupWidth * i + barGap / 2;

            if (isGrouped && Array.isArray(d.values)) {
                d.values.forEach(function (v, si) {
                    var barH = (v / maxVal) * chartH;
                    var barX = groupX + barWidth * si;
                    var barY = padding.top + chartH - barH;
                    var color = series[si] ? series[si].color : '#93c5fd';
                    var tooltipData = JSON.stringify({
                        label: d.label,
                        seriesIndex: si,
                        value: v,
                        tooltip: d.tooltip || {}
                    }).replace(/"/g, '&quot;');

                    svg += '<rect class="ed-chart-bar" x="' + barX + '" y="' + barY + '" width="' + barWidth + '" height="' + barH + '" fill="' + color + '" rx="2" data-chart-tooltip="' + tooltipData + '"/>';
                });
            } else {
                var val = d.value || 0;
                var barH2 = (val / maxVal) * chartH;
                var barX2 = groupX + (barGroupWidth - barGap - barWidth) / 2;
                var barY2 = padding.top + chartH - barH2;
                var color2 = series[0] ? series[0].color : '#93c5fd';
                var tooltipData2 = JSON.stringify({
                    label: d.label,
                    value: val,
                    tooltip: d.tooltip || {}
                }).replace(/"/g, '&quot;');

                svg += '<rect class="ed-chart-bar" x="' + barX2 + '" y="' + barY2 + '" width="' + barWidth + '" height="' + barH2 + '" fill="' + color2 + '" rx="2" data-chart-tooltip="' + tooltipData2 + '"/>';
            }

            var labelX = groupX + (barGroupWidth - barGap) / 2;
            svg += '<text x="' + labelX + '" y="' + (h - padding.bottom + 18) + '" text-anchor="middle" fill="' + categoryFill + '" font-family="' + font + '" font-size="11">' + escapeHtml(d.label || '') + '</text>';
        });

        if (config.yLabel) {
            svg += '<text x="15" y="' + (h / 2) + '" text-anchor="middle" fill="' + axisLabelFill + '" font-family="' + font + '" font-size="10" transform="rotate(-90, 15, ' + (h / 2) + ')">' + escapeHtml(config.yLabel) + '</text>';
        }

        if (config.xLabel) {
            svg += '<text x="' + (w / 2) + '" y="' + (h - 8) + '" text-anchor="middle" fill="' + axisLabelFill + '" font-family="' + font + '" font-size="10">' + escapeHtml(config.xLabel) + '</text>';
        }

        svg += '</svg>';
        return svg;
    }

    function generateLegend(series) {
        var legend = '<div class="ed-chart-legend">';
        normalizeSeries(series).forEach(function (s) {
            if (s.name) {
                legend += '<div class="ed-chart-legend-item">';
                legend += '<span class="ed-chart-legend-dot" style="background:' + s.color + '"></span>';
                legend += '<span>' + escapeHtml(s.name) + '</span>';
                legend += '</div>';
            }
        });
        legend += '</div>';
        return legend;
    }

    function buildHtml(config) {
        var title = config.title ? '<div class="ed-chart-title">' + escapeHtml(config.title) + '</div>' : '';
        return title + generateSVG(config) + generateLegend(config.series || config.colors);
    }

    function createTooltip() {
        if (chartTooltip) return chartTooltip;
        chartTooltip = document.createElement('div');
        chartTooltip.className = 'ed-chart-tooltip';
        document.body.appendChild(chartTooltip);
        return chartTooltip;
    }

    function showTooltip(x, y, content) {
        var tip = createTooltip();
        tip.innerHTML = content;
        tip.classList.add('visible');

        var rect = tip.getBoundingClientRect();
        var left = x + 12;
        var top = y - 12;

        if (left + rect.width > window.innerWidth - 10) left = x - rect.width - 12;
        if (top + rect.height > window.innerHeight - 10) top = y - rect.height - 12;
        if (top < 10) top = 10;

        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
    }

    function hideTooltip() {
        if (chartTooltip) chartTooltip.classList.remove('visible');
    }

    function bindTooltips(container, config) {
        var series = normalizeSeries(config.series || config.colors);
        container.querySelectorAll('[data-chart-tooltip]').forEach(function (bar) {
            bar.addEventListener('mouseenter', function (e) {
                var tipData = JSON.parse(this.getAttribute('data-chart-tooltip'));
                var html = '';

                if (tipData.tooltip && Object.keys(tipData.tooltip).length > 0) {
                    Object.keys(tipData.tooltip).forEach(function (key) {
                        html += '<div class="ed-chart-tooltip-row"><span class="ed-chart-tooltip-label">' + escapeHtml(key) + ':</span> ' + escapeHtml(tipData.tooltip[key]) + '</div>';
                    });
                }

                if (tipData.seriesIndex !== undefined) {
                    var seriesName = series[tipData.seriesIndex] ? series[tipData.seriesIndex].name : 'Series ' + (tipData.seriesIndex + 1);
                    html += '<div class="ed-chart-tooltip-row"><span class="ed-chart-tooltip-label">Condition:</span> ' + escapeHtml(seriesName) + '</div>';
                }

                html += '<div class="ed-chart-tooltip-row"><span class="ed-chart-tooltip-label">Value:</span> <span class="ed-chart-tooltip-value">' + escapeHtml(tipData.value) + '</span></div>';
                showTooltip(e.clientX, e.clientY, html);
            });

            bar.addEventListener('mousemove', function (e) {
                if (chartTooltip && chartTooltip.classList.contains('visible')) {
                    chartTooltip.style.left = (e.clientX + 12) + 'px';
                    chartTooltip.style.top = (e.clientY - 12) + 'px';
                }
            });

            bar.addEventListener('mouseleave', hideTooltip);
        });
    }

    function render(container, options) {
        if (!container) return null;
        options = options || {};
        var config = options.config || parseConfig(container);
        if (!config || !config.data || !config.data.length) return null;

        container.innerHTML = buildHtml(config);
        container.setAttribute('data-chart-config', encodeConfig(config));
        container.setAttribute('contenteditable', 'false');

        if (options.bindTooltips !== false) {
            bindTooltips(container, config);
        }

        return config;
    }

    function renderAll(root, options) {
        root = root || document;
        options = options || {};
        var nodes = root.querySelectorAll('.ed-chart-container');
        nodes.forEach(function (el) {
            render(el, options);
        });
        return nodes.length;
    }

    function createContainer(config) {
        var el = document.createElement('div');
        el.className = 'ed-chart-container';
        el.setAttribute('contenteditable', 'false');
        el.setAttribute('data-chart-config', encodeConfig(config));
        render(el, { config: config });
        return el;
    }

    global.EdChart = {
        normalizeSeries: normalizeSeries,
        parseConfig: parseConfig,
        encodeConfig: encodeConfig,
        generateSVG: generateSVG,
        generateLegend: generateLegend,
        buildHtml: buildHtml,
        render: render,
        renderAll: renderAll,
        createContainer: createContainer,
        bindTooltips: bindTooltips,
        hideTooltip: hideTooltip
    };
})(typeof window !== 'undefined' ? window : this);
