/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
TODO(adamvy):
- Only serialize the ordinal?
- Make all properties final ?
*/

foam.CLASS({
  package: 'foam.core.internal',
  name: 'EnumValue',
  properties: [
    {
      class: 'String',
      name: 'name',
      preSet: function(_, s) {
        return foam.String.constantize(s);
      }
    },
    {
      class: 'Int',
      name: 'ordinal',
    },
    {
      name: 'values'
    }
  ],
  methods: [
    function installInClass(cls) {
      var name = this.name;
      var ordinal = this.ordinal;

      Object.defineProperty(
        cls,
        name,
        {
          configurable: true,
          get: function() {
            var value = cls.create({ ordinal: ordinal });

            Object.defineProperty(
              cls,
              name,
              {
                value: value,
                writable: false,
                configurable: false
              });

            return value;
          }
        });
    },
    function installInProto(proto) {
      this.installInClass(proto);
    }
  ]
});

foam.CLASS({
  package: 'foam.core',
  name: 'EnumModel',
  properties: [
    {
      name: 'axioms_',
      factory: function() {
        return [
          foam.core.Int.create({
            name: 'ordinal',
            final: true
          }),
          {
            name: 'enum_create',
            installInClass: function(cls) {
              var instances = {};
              var oldCreate = cls.create;

              cls.create = function(args, X) {
                var key = args.ordinal;
                var values = cls.model_.values.find(function(o) {
                  return o.ordinal === key;
                });

                foam.X.assert(values, 'No enum value found with ordinal', key);
                values = values.values;
                values.ordinal = key;

                return instances[key] || ( instances[key] = oldCreate.call(this, values, X) );
              };
            }
          }
        ];
      }
    },
    {
      class: 'String',
      name: 'name'
    },
    {
      class: 'String',
      name: 'package'
    },
    {
      class: 'String',
      name: 'id',
      expression: function(name, package) {
        return package ? package + '.' + name : name;
      }
    },
    {
      class: 'AxiomArray',
      of: 'foam.core.Property',
      name: 'properties'
    },
    {
      class: 'AxiomArray',
      of: 'foam.core.Method',
      name: 'methods'
    },
    {
      class: 'AxiomArray',
      of: 'foam.core.Constant',
      name: 'constants'
    },
    {
      class: 'AxiomArray',
      of: 'foam.core.internal.EnumValue',
      name: 'values',
      preSet: function(_, v) {
        var next = 0;
        for ( var i = 0 ; i < v.length ; i++ ) {
          if ( ! v[i].hasOwnProperty('ordinal') ) v[i].ordinal = next++;
          else next = v[i].ordinal + 1;
        }

        return v;
      }
    }
  ],
  methods: [
    function buildClass() {
      var cls;

      var parent = foam.core.FObject;

      cls = Object.create(parent);
      cls.prototype = Object.create(parent.prototype);
      cls.prototype.cls_ = cls;
      cls.prototype.model_ = this;
      cls.private_ = { axiomCache: {} };
      cls.axiomMap_ = Object.create(parent.axiomMap_);
      cls.id = this.id;
      cls.package = this.package;
      cls.name = this.name;
      cls.model_ = this;

      cls.installModel(this);

      var values;
      var model = this;

      cls.getValues = function() {
        if ( ! values ) {
          values = model.values.map(function(m) {
            return cls[m.name];
          });
        }
        return values;
      }

      return cls;
    }
  ]
});


foam.CLASS({
  package: 'foam.core',
  name: 'Enum',
  extends: 'Property',
  properties: [
    { name: 'of', required: true },
    [
      'adapt',
      function(old, nu, prop) {
        console.log("Adapt", nu);
        var type = foam.typeOf(nu);
        if ( type === foam.FObject ) {
          return nu;
        }

        var e = this.X.lookup(prop.of);

        if ( type === foam.String ) {
          console.log('Converting from string', nu);
          return e[nu];
        } else if ( type === foam.Number ) {
          return e.create({ ordinal: nu });
        }
      }
    ]
  ]
});

foam.ENUM = function(m) {
  var model = foam.core.EnumModel.create(m);
  model.validate();
  var cls = model.buildClass();
  cls.validate();

  foam.register(cls);

  // TODO: Move this to a single shared spot.
  var path = cls.id.split('.');
  var root = global;

  for ( var i = 0 ; i < path.length-1 ; i++ ) {
    root = root[path[i]] || ( root[path[i]] = {} );
  }

  root[path[path.length-1]] = cls;
  return cls;
};
