class RenameCustomElementsWebpackPlugin {
  constructor(options) {
    this.options = {
      prefix: '',
      suffix: Date.now().toString(36),
      index: 'index.html',
      tagFilter: /.*/,
      ...options,
    };

    if (this.options.prefix) {
      this.options.prefix += '-';
    }

    if (this.options.suffix) {
      this.options.suffix = `-${this.options.suffix}`;
    }
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync(
      'RenameCustomElementsWebpackPlugin',
      (compilation, callback) => {
        const customElements = this.getCustomElementTags(compilation);
        this.renameCustomElements(compilation, customElements);

        callback();
      }
    );
  }

  getCustomElementTags(compilation) {
    const { chunks, assets } = compilation;
    let tags = [];
    chunks.forEach((chunk) => {
      chunk.files.forEach((filename) => {
        const source = assets[filename].source();
        if (source) {
          const foundTags = this.findCustomElementInSource(source);
          tags = tags.concat(foundTags);
        }
      });
    });
    return [...new Set(tags.filter((tag) => this.options.tagFilter.test(tag)))];
  }

  findCustomElementInSource(source) {
    const cePattern = /customElements\.define\(['"]([a-z0-9-]+)['"]/g;
    const matchedCustomElements = source.match(cePattern);
    const customElementTags = [];
    if (matchedCustomElements) {
      matchedCustomElements.forEach((item) => {
        customElementTags.push(item.replace(cePattern, '$1'));
      });
    }
    return [...new Set(customElementTags)];
  }

  renameCustomElements(compilation, customElements) {
    const { chunks, assets } = compilation;
    const { index } = this.options;

    chunks.forEach((chunk) => {
      chunk.files.forEach((filename) => {
        const source = assets[filename].source();
        if (source) {
          const updatedSource = this.updateCustomElementsInSource(
            source,
            customElements
          );
          assets[filename] = {
            source: () => updatedSource,
            size: () => updatedSource.length,
          };
        }
      });
    });

    if (assets[index]) {
      const source = assets[index].source();
      const updatedSource = this.updateCustomElementsInSource(
        source,
        customElements
      );
      assets[index] = {
        source: () => updatedSource,
        size: () => updatedSource.length,
      };
    }
  }

  updateCustomElementsInSource(source, customElements) {
    let updatedSource = source;
    customElements.forEach((element) => {
      updatedSource = this.replaceAll(
        updatedSource,
        `(?<![\\w-])(${element})(?=[^\\w-])`,
        `${this.options.prefix}${element}${this.options.suffix}`
      );
    });
    return updatedSource;
  }

  replaceAll(str, find, replace) {
    const regex = new RegExp(find, 'g');
    const result = str.replace(regex, replace);
    return result;
  }
}

module.exports = RenameCustomElementsWebpackPlugin;
