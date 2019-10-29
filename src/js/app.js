App = {
  web3Provider: null,
  contracts: {},
  numberofItems: 0,
  beneficiary: null,
  winners: new Array(),
  init: function () {
    $.getJSON('../sneaker.json', function (data) {
      numberofItems = data.length;
      var sneakerRow = $('#sneakerRow');
      var sneakerTemplate = $('#template');
      for (i = 0; i < data.length; i++) {
        sneakerTemplate.find('.card-title').text(data[i].name);
        sneakerTemplate.find('.card-img-top').attr('src', data[i].picture);
        sneakerTemplate.find('.bid').attr('id', "bid" + data[i].id);
        sneakerTemplate.find('.bid').attr('data-id', data[i].id);
        sneakerTemplate.find('.inputBid').attr('id', "inputBid" + data[i].id)
        sneakerTemplate.find('.numberofToken').attr('id', data[i].id);
        $(`#item${i+1}`).find('img').attr('src', data[i].picture);
        $(`#item${i+1}`).find('h5').text(data[i].name);
        sneakerRow.append(sneakerTemplate.html());
      }
    });
    $('.inputBid').keyup(function () {
      if (this.value != this.value.replace(/[^0-9]/g, '')) {
        this.value = this.value.replace(/[^0-9]/g, '');
      }
    });
    return App.initWeb3();
  },

  initWeb3: function () {
    if (typeof web3 !== undefined) {
      App.web3Provider = window.web3.currentProvider;
    } else {
      App.web3Provider = new Web3.providers.HttpProvider("http://127.0.0.1:7545")
    }
    web3 = new Web3(App.web3Provider);
    App.web3Provider.enable();
    return App.initContract();
  },

  initContract: async function () {
    $.getJSON("Auction.json", async function (data) {
      var adoptionArtifact = data;
      App.contracts.auction = TruffleContract(adoptionArtifact);
      App.contracts.auction.setProvider(App.web3Provider);
      await App.authorizeUser()
      await App.displayWinner()
      return App.displayBidToken();
    });
    return App.bindEvents();
  },
  bindEvents: function () {
    $(document).on('click', '#registerBtn', App.register)
    $(document).on('click', '#revealBtn', App.revealWinner)
    $(document).on('click', '.bid', App.bid)
    $(document).on('keyup', '.inputBid', App.validateInputBid)
  },
  validateInputBid: function () {
    if (this.value != this.value.replace(/[^0-9]/g, '')) {
      this.value = this.value.replace(/[^0-9]/g, '');
    }
  },
  bid: function (event) {
    event.preventDefault();
    var itemId = parseInt($(event.target).data('id'));
    var token = $(`#inputBid${itemId}`).val();
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      App.contracts.auction.deployed().then(function (instance) {
        return instance.bid.sendTransaction(itemId, token, {
          from: accounts[0]
        })
      }).then(async function (result) {
        await Swal.fire({
          type: 'success',
          title: 'You bid successfully',
          text: 'Good luck',
        })
      }).then(function () {
        App.displayBidToken();
        App.authorizeUser();
      }).catch(function (error) {
        Swal.fire({
          type: 'error',
          title: 'Oops...',
          text: 'You do not have enough tokens',
        })
        console.log(error.message);

      });
    });
  },
  register: function (event) {
    event.preventDefault();
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      App.contracts.auction.deployed().then(function (instance) {
        return instance.register.sendTransaction({
          from: accounts[0]
        })
      }).then(function () {
        Swal.fire({
          type: 'success',
          title: 'You registered successfully',
          text: "Let's bid",
        })
      }).then(function () {
        return App.authorizeUser();
      }).catch(function (error) {
        Swal.fire({
          type: 'error',
          title: 'Oops...',
          text: 'The number of bidder is full',
        })
        console.log(error.message);

      });
    });
  },
  displayBidToken: function () {
    for (let i = 0; i < numberofItems; i++) {
      App.contracts.auction.deployed().then(function (instance) {
        return instance.getTokensFromItem.call(i);
      }).then(function (itemTokens) {
        $(`#${i}`).text(`Total of bid tokens: ${itemTokens.length}`);
      })
    }

  },
  authorizeUser: function () {
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      App.contracts.auction.deployed().then(async function (instance) {
        return instance.beneficiary.call();
      }).then(function (beneficiary) {
        if (beneficiary == accounts[0]) {
          $('#registerBtn').hide()
          $('.user').hide()
          $('#revealBtn').show()
          $('.owner').show()
          $('#avatarUser').attr("src","../images/owner.png")
        } else {
          $('.owner').hide()
          $('.user').show()
          $('#revealBtn').hide();
          $('#avatarUser').attr("src","../images/user.png")
        }
        console.log("authorizeuser");
        
      }).catch(function (error) {
        console.log(error.message);
      });
      App.contracts.auction.deployed().then(async function (instance) {
        return instance.getBidder.call(accounts[0]);
      }).then(function (bidder) {
        console.log(bidder[0]);
        
        if (bidder[0] == 0) {
          $('#nameUser').text('Guest')
          $('#remainingToken').text('')
          $('.bid').attr("disabled", true)
        } else {
          $('#registerBtn').hide()
          $('#nameUser').text(`User ${bidder[0]}`)
          $('#remainingToken').text(`Have ${bidder[1]} tokens left`)
          $('.bid').attr("disabled", false)
        }
      }).catch(function (error) {
        console.log(error.message);
      });
    });
  },
  revealWinner: function () {
    web3.eth.getAccounts(function (error, accounts) {
      App.contracts.auction.deployed().then(function (instance) {
        return instance.revealWinners.sendTransaction({
          from: accounts[0]
        })
      }).then(function () {
          App.displayWinner(winners);
        }).catch(function (error) {
          console.log(error.message);
        });
    })
  },
  displayWinner: function () {
    web3.eth.getAccounts(function (error, accounts) {
      App.contracts.auction.deployed().then(function (instance) {
        return instance.getWinners.call()
      }).then(function (winners) {
        for(var i=0;i<winners.length;i++){
          $(`#winner${i+1}`).text(`${winners[i]}`)
          if(parseInt(winners[i])!=0){
            if(winners[i]==accounts[0]){    
            $(`#inputBid${i}`).parent().text('You are winner')
            }
            else{
              $(`#inputBid${i}`).parent().text('Auction Ended')
            }
          }
        }
      }).catch(function (error) {
        console.log(error.message);
      });
    })
  }

};

$(function () {
  $(document).ready(function () {
    App.init();
    ethereum.on('accountsChanged', function (accounts) {
      location.reload(true);
    })

  });
});