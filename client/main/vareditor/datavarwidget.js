
'use strict';

const $ = require('jquery');
const Backbone = require('backbone');
Backbone.$ = $;
const DataVarLevelWidget = require('./datavarlevelwidget');

const DataVarWidget = Backbone.View.extend({
    className: 'DataVarWidget',
    initialize(args) {

        this.attached = false;

        this.$el.empty();
        this.$el.addClass('jmv-variable-editor-datavarwidget');

        this.$body = $('<div class="jmv-variable-editor-widget-body"></div>').appendTo(this.$el);
        this.$left = $('<div class="jmv-variable-editor-widget-left"></div>').appendTo(this.$body);
        this.$types = $('<div class="jmv-variable-editor-widget-types"></div>').appendTo(this.$left);
        this.$autoType = $('<div class="jmv-variable-editor-autotype">(auto adjusting)</div>').appendTo(this.$left);

        this.$levelsContainer = $('<div class="jmv-variable-editor-levels-container"></div>').appendTo(this.$body);
        this.$levelsTitle = $('<div class="jmv-variable-editor-levels-title">Levels</div>').appendTo(this.$levelsContainer);
        this.$levels = $('<div class="jmv-variable-editor-levels"></div>').appendTo(this.$levelsContainer);
        this.$levelItems = $();
        this.levelCtrls = [];

        this.$move = $('<div class="jmv-variable-editor-widget-move"></div>').appendTo(this.$body);
        this.$moveUp = $('<div class="jmv-variable-editor-widget-move-up"><span class="mif-arrow-up"></span></div>').appendTo(this.$move);
        this.$moveDown = $('<div class="jmv-variable-editor-widget-move-down"><span class="mif-arrow-down"></span></div>').appendTo(this.$move);

        this.$moveUp.on('click', event => this._moveUp());
        this.$moveDown.on('click', event => this._moveDown());
        this.selectedLevelIndex = -1;

        let options = [
            { label: 'Continuous',   measureType: 'continuous' },
            { label: 'Ordinal',      measureType: 'ordinal' },
            { label: 'Nominal',      measureType: 'nominal' },
            { label: 'Nominal Text', measureType: 'nominaltext' },
        ];

        this.resources = { };

        let unique = Math.random();

        let optionClicked = (event) => {
            this.model.set({ measureType: event.data, autoMeasure: false });
        };

        for (let option of options) {
            let measureType = option.measureType;
            let $option = $('<div   data-type="' + measureType + '" class="jmv-variable-editor-widget-option">').appendTo(this.$types);
            let $input  = $('<input data-type="' + measureType + '" name="' + unique + '" type="radio">').appendTo($option);
            let $icon   = $('<div   data-type="' + measureType + '" class="jmv-variable-editor-variable-type"></div>').appendTo($option);
            let $label  = $('<span>' + option.label + '</span>').appendTo($option);

            $option.on('click', null, measureType, optionClicked);

            this.resources[option.measureType] = { $option : $option, $input : $input };
        }

        this.$typesHighlight = $('<div class="jmv-variable-editor-widget-types-highlight"></div>').appendTo(this.$types);

        this.model.on('change:measureType', event => this._setOptions(event.changed.measureType, this.model.get('levels')));
        this.model.on('change:levels',      event => this._setOptions(this.model.get('measureType'), event.changed.levels));
        this.model.on('change:autoMeasure', event => this._setAutoMeasure(event.changed.autoMeasure));
    },
    _moveUp() {
        if (this.attached === false)
            return;
        if (this.model.attributes.measureType === 'continuous')
            return;
        let index = this.selectedLevelIndex;
        if (index < 1)
            return;
        let levels = this.model.get('levels');
        let clone  = levels.slice(0);
        let item   = clone.splice(index, 1)[0];
        clone.splice(index - 1, 0, item);
        this.selectedLevelIndex--;
        this.model.set('levels', clone);
    },
    _moveDown() {
        if (this.attached === false)
            return;
        if (this.model.attributes.measureType === 'continuous')
            return;
        let index = this.selectedLevelIndex;
        let levels = this.model.get('levels');
        if (index === -1 || index >= levels.length - 1)
            return;
        let clone  = levels.slice(0);
        let item   = clone.splice(index, 1)[0];
        clone.splice(index + 1, 0, item);
        this.selectedLevelIndex++;
        this.model.set('levels', clone);
    },
    _enableDisableMoveButtons() {
        if (this.model.attributes.measureType !== 'continuous') {
            let levels = this.model.get('levels');
            let index  = this.selectedLevelIndex;
            this.$moveUp.toggleClass('disabled', index < 1);
            this.$moveDown.toggleClass('disabled', index >= levels.length - 1 || index === -1);
        }
        else {
            this.$moveUp.addClass('disabled');
            this.$moveDown.addClass('disabled');
        }
    },
    _setOptions(measureType, levels) {
        if ( ! this.attached)
            return;

        for (let t in this.resources) {
            let $option = this.resources[t].$option;

            if (t === measureType) {
                let $input  = this.resources[measureType].$input;
                $input.prop('checked', true);
                $option.addClass('selected');

                let css = $option.position();
                css.width = $option.width();
                css.height = $option.height();

                this.$typesHighlight.css(css);
            }
            else {
                $option.removeClass('selected');
            }
        }

        if (levels.length === 0) {
            this.$levels.empty();
            this.levelCtrls = [];
        }
        else if (this.levelCtrls.length > levels.length) {
            for (let i = levels.length; i < this.$levelItems.length; i++)
                this.$levelItems[i].remove();
            this.levelCtrls.splice(levels.length, this.levelCtrls.length - levels.length);
        }

        this.$moveUp.addClass('disabled');
        this.$moveDown.addClass('disabled');

        if (levels) {

            let _clickCallback = event => {
                this.$levelItems.removeClass('selected');
                let $level = $(event.delegateTarget);
                $level.addClass('selected');

                let index = this.$levelItems.index($level);
                this.selectedLevelIndex = index;
                this._enableDisableMoveButtons();
            };

            this.$levelItems.removeClass('selected');
            for (let i = 0; i < levels.length; i++) {
                let level = levels[i];
                let levelCtrl = null;
                if (i >= this.levelCtrls.length) {
                    levelCtrl = new DataVarLevelWidget(level, this.model, i);

                    this.$levels.append(levelCtrl.$el);
                    this.levelCtrls.push(levelCtrl);

                    levelCtrl.$el.on('click', _clickCallback);
                }
                else {
                    levelCtrl = this.levelCtrls[i];
                    levelCtrl.updateLevel(level);
                }

                if (i === this.selectedLevelIndex)
                    levelCtrl.$el.addClass('selected');
            }
        }

        this.$levelItems = this.$levels.find('.jmv-variable-editor-level');

        this._enableDisableMoveButtons();
    },
    _setAutoMeasure(auto) {
        if ( ! this.attached)
            return;
        if (auto)
            this.$autoType.show();
        else
            this.$autoType.hide();
    },
    detach() {
        if ( ! this.attached)
            return;
        this.model.apply();
        this.attached = false;
    },
    attach() {
        this.attached = true;
        this.selectedLevelIndex = -1;
        this._setAutoMeasure(this.model.get('autoMeasure'));
        this._setOptions(this.model.get('measureType'), this.model.get('levels'));
    }
});

module.exports = DataVarWidget;
