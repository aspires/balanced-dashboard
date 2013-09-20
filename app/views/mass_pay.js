Balanced.MassPayModalView = Balanced.View.extend({

        csvToArray: function(CSV){
                var allTextLines = CSV.split(/\r\n|\n/);
                var entries = allTextLines[0].split(',');
                var lines = [];
                var headings = entries.splice(0,record_num);
                while (entries.length>0) {
                    var tarr = [];
                    for (var j=0; j<record_num; j++) {
                        tarr.push(headings[j]+":"+entries.shift());
                    }
                    lines.push(tarr);
                }
                return lines;
        },
        templateName: 'modals/mass_pay',

        didInsertElement: function () {
                this.get('controller').on('openMassPayModal', this, this.open);
        },

        willDestroyElement: function () {
                this.get('controller').off('openMassPayModal', this, this.open);
        },

        actions: {
                save: function () {
                        var csvLength = csvToArray.length, element = null;
                        for (var i = 0; i < length ; i++){
                                element = csvToArray[i];
                                var credit = Balanced.Credit.create({uri: '/v1/credits'});
                                credit.set('name': element[name]);
                                credit.set('bank_account', Balanced.BankAccount.create({
                                                'type': element[account-type],
                                                'account': element[account-number],
                                                'routing': element[routing-number]
                                }));
                                credit.set('ammount': element[ammount]);
                                credit.set('statement': element[statement]);
                                credit.set('description': element[description]);

                                credit.save()
                        }
                        function () {
                                $('#pay-seller').modal('hide');
                                        self.get('controller').transitionToRoute('credits');
                        };
                }
        }
});
