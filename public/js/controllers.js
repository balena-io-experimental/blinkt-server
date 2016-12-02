// public/core.js
var blinky = angular.module('blinky', []);

blinky.controller('mainController', [ '$scope', '$http', function ($scope, $http) {
    $scope.formData = {};

    $http.get('/leds')
    .success(function (data) {
        $scope.leds = data;
        console.log(data);
    })
    .error(function (data) {
        console.log('Error: ' + data);
    });
    $http.get('/presets')
    .success(function (data) {
        $scope.presets = data;
        console.log(data);
    })
    .error(function (data) {
        console.log('Error: ' + data);
    });

    $scope.enableLight = function (id) {
        console.log(id);
        $http.post('/leds/' + id)
        .error(function(data) {
            console.log('Error: ' + data);
        });
    };

    $scope.runPreset = function (name) {
        $http.post('/presets/' + name)
        .error(function(data) {
            console.log('Error: ' + data);
        });
    };
}]);