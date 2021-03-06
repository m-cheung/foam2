/**
 * @license
 * Copyright 2017 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.dao',
  name: 'LastModifiedAwareDAO',
  extends: 'foam.dao.ProxyDAO',

  documentation: 'Sets lastModified timestamp on put() of LastModifiedAware objects.',

  methods: [
    {
      name: 'put_',
      code: function(value) {
        value.lastModified = new Date();
        return SUPER(value);
      }
    }
  ]
});
