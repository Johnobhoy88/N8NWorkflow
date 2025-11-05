/**
 * Knowledge Base Loader for n8n QA Validator
 * Loads and validates all knowledge base JSON files
 *
 * Usage in n8n Code Node:
 * const KBLoader = require('./knowledge-base-loader.js');
 * const kb = await KBLoader.load();
 * return [{ json: kb }];
 */

const fs = require('fs');
const path = require('path');

class KnowledgeBaseLoader {
  constructor() {
    this.kbDir = path.join(__dirname, '../knowledge-bases');
    this.files = {
      patterns: 'patterns.json',
      nodeCatalog: 'node-catalog.json',
      validationRules: 'validation-rules.json',
      bestPractices: 'best-practices.json'
    };
  }

  /**
   * Load all knowledge base files
   * @returns {Promise<Object>} Merged knowledge base
   */
  async load() {
    try {
      const patterns = this.loadJSON(this.files.patterns);
      const nodeCatalog = this.loadJSON(this.files.nodeCatalog);
      const validationRules = this.loadJSON(this.files.validationRules);
      const bestPractices = this.loadJSON(this.files.bestPractices);

      return {
        version: '1.0.0',
        loadedAt: new Date().toISOString(),
        patterns: patterns.patterns || [],
        nodeCatalog: nodeCatalog.nodes || [],
        validationRules: validationRules.validationCategories || {},
        bestPractices: bestPractices.categories || {},
        principles: bestPractices.principles || [],
        stats: {
          patternCount: patterns.totalPatterns || 0,
          nodeCount: nodeCatalog.totalNodes || 0,
          validationRuleCount: this.countRules(validationRules),
          practiceCount: this.countPractices(bestPractices)
        }
      };
    } catch (error) {
      throw new Error(`Failed to load knowledge base: ${error.message}`);
    }
  }

  /**
   * Load and parse a JSON file
   * @param {string} filename
   * @returns {Object} Parsed JSON
   */
  loadJSON(filename) {
    try {
      const filePath = path.join(this.kbDir, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load ${filename}: ${error.message}`);
    }
  }

  /**
   * Count total rules in validation rules
   */
  countRules(validationRules) {
    let count = 0;
    const categories = validationRules.validationCategories || {};
    for (const category in categories) {
      const rules = categories[category].rules || [];
      count += rules.length;
    }
    return count;
  }

  /**
   * Count total practices in best practices
   */
  countPractices(bestPractices) {
    let count = 0;
    const categories = bestPractices.categories || {};
    for (const category in categories) {
      const practices = categories[category].practices || [];
      count += practices.length;
    }
    return count;
  }

  /**
   * Get patterns for a specific category
   */
  getPatternsByCategory(patterns, category) {
    return patterns.filter(p => p.category === category);
  }

  /**
   * Get patterns by priority
   */
  getPatternsByPriority(patterns, priority) {
    return patterns.filter(p => p.priority === priority);
  }

  /**
   * Get node configuration from catalog
   */
  getNodeConfig(nodeCatalog, nodeType) {
    return nodeCatalog.find(n => n.type === nodeType);
  }

  /**
   * Get validation rules for a node type
   */
  getValidationRulesForNodeType(validationRules, nodeType) {
    const rules = [];
    const categories = validationRules.validationCategories || {};

    for (const categoryName in categories) {
      const category = categories[categoryName];
      const categoryRules = category.rules || [];

      const matchingRules = categoryRules.filter(rule => {
        const nodeTypes = rule.nodeTypes || [];
        return nodeTypes.includes(nodeType) || nodeTypes.length === 0;
      });

      rules.push(...matchingRules);
    }

    return rules;
  }

  /**
   * Create a summary of the knowledge base
   */
  getSummary(kb) {
    return {
      version: kb.version,
      loadedAt: kb.loadedAt,
      stats: kb.stats,
      readyForValidation: true
    };
  }
}

// For use as module
module.exports = new KnowledgeBaseLoader();

// For direct execution (testing)
if (require.main === module) {
  (async () => {
    try {
      const kb = await module.exports.load();
      console.log('✅ Knowledge Base Loaded Successfully');
      console.log(module.exports.getSummary(kb));
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}
