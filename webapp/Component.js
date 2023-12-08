/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    'sap/m/MessageToast',
    "sap/ui/model/json/JSONModel"
],
    function (UIComponent, MessageToast, JSONModel) {
        "use strict";

        return UIComponent.extend("shodan.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);
                //get module path, used later on
                this.modulePath = sap.ui.require.toUrl("shodan");
                //models
                var oModel = new JSONModel(this.modulePath + "/cpiURL");
                var oModelUser = initUserModel();
                var oResoucesModel = new JSONModel({img: this.modulePath + "/img/bot.jpg"});
                //create chat button
                var rendererPromise = this._getRenderer();
                rendererPromise.then(function(oRenderer) {
                    oRenderer.addHeaderItem({
                        icon: "sap-icon://discussion",
            		    tooltip: "Open chat bot",
                        press: function() {
                            if(this.oPopover){
                                if(this.oPopover.isActive()){
                                    this.oPopover.close();
                                    return;
                                }                                    
                            }                            
                            //get popover fragment (chat container in this case)
                            this.oPopover = sap.ui.xmlfragment("shodan.fragment.Popup");
                            this.oPopover.attachAfterClose(function() {
                                this.destroy();
                            });
                            //set models: chat itself and user data (for displaying details)
                            this.oPopover.setModel(oModel, "chat");
                            this.oPopover.setModel(oModelUser, "userModel");
                            this.oPopover.setModel(oResoucesModel, "resourceModel");
                            //open popover
                            this.oPopover.openBy(this);       
                        }
                    }, true, true);
                });
            },
            initUserModel: function(){
                //this get service UserInfo. Currently logged user's information can be retrieved (like name). Used for some information stuff in chat window
                var userInfo = sap.ushell.Container.getService("UserInfo");
                var oData = {
                    user: {
                        FirstName: userInfo.getFirstName(),
                        LastName: userInfo.getLastName(),
                        FullName: userInfo.getFullName(),
                        Initials: userInfo.getFirstName().charAt(0) + userInfo.getLastName().charAt(0)
                    }
                };
                return new JSONModel(oData);
            },
            handleActionSend: function(oEvent){
                //get objects to be read
                var oTextArea = sap.ui.getCore().byId("TextArea1");
                var oNotificationList = sap.ui.getCore().byId("TNotificationList1");
                //get textArea value and clear it
                var textValue = oTextArea.getValue();
                oTextArea.setValue("");
                //get model
                var oModel = this.oPopover.getModel("chat");
                //get data and add new message
                var oCurrentData = oModel.getData();
                oCurrentData.messages.push({
                    role: "user", 
					content: textValue
                });
                oModel.setData(oCurrentData);
                //set busy
                oNotificationList.setBusy(true);
                //call external, chat API
                jQuery.ajax({
                    url: this.modulePath + "/cpiURL",
					type: "POST",
                    data: JSON.stringify(oCurrentData),
                    async: true,
                    dataType: "json",
                    setTimeout: 60,
                    contentType: "application/json",
                    success: function (data, textStatus, jqXHR) {
                        oModel.setData(data);
                        //this scrolls down chat to the last message. 
                        //-cont is area where content is generated, so it scrolls only this container
                        $("#myPopover-cont").animate({ scrollTop: 100000000000}, 1000);
                        //disable busy
                        oNotificationList.setBusy(false);
                    },
                    error: function (xhr, ajaxOptions, thrownError) {
                        //in case of an error user is on his own
                        console.log("-error->");
                        console.log(xhr);
                        console.log(thrownError);
                        console.log("<-error-");
                    }
                });
            },
            handleActionClose: function(oEvent){
                //this.byId("myPopover").close();
                this.oPopover.close();
                MessageToast.show("Chat has been closed");
            },
            _getRenderer: function () {
                var that = this,
                    oDeferred = new jQuery.Deferred(),
                    oRenderer;

                that._oShellContainer = jQuery.sap.getObject("sap.ushell.Container");
                if (!that._oShellContainer) {
                    oDeferred.reject(
                        "Illegal state: shell container not available; this component must be executed in a unified shell runtime context.");
                } else {
                    oRenderer = that._oShellContainer.getRenderer();
                    if (oRenderer) {
                        oDeferred.resolve(oRenderer);
                    } else {
                        // renderer not initialized yet, listen to rendererCreated event
                        that._onRendererCreated = function (oEvent) {
                            oRenderer = oEvent.getParameter("renderer");
                            if (oRenderer) {
                                oDeferred.resolve(oRenderer);
                            } else {
                                oDeferred.reject("Illegal state: shell renderer not available after recieving 'rendererLoaded' event.");
                            }
                        };
                        that._oShellContainer.attachRendererCreatedEvent(that._onRendererCreated);
                    }
                }
                return oDeferred.promise();
            }
        });
    }
);