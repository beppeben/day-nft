package utils

import (
	"github.com/spf13/viper"
)

type AppConfig struct {
	v *viper.Viper
}

func NewConfig(path string) *AppConfig {
	v := viper.New()
	v.SetConfigName("config")
	v.SetConfigType("toml")
	v.AddConfigPath(path)
	err := v.ReadInConfig()
	if err != nil {
		panic(err.Error())
	}

	return &AppConfig{v}
}

func NewAppConfig() *AppConfig {
	return NewConfig("./")
}

func NewCustomAppConfig(v *viper.Viper) *AppConfig {
	return &AppConfig{v}
}

func (val *AppConfig) GetAccessPoint() string {
	return val.v.GetString("ACCESS_POINT")
}

func (val *AppConfig) GetContractAddress() string {
	return val.v.GetString("CONTRACT_ADDRESS")
}

func (val *AppConfig) GetSketchPath() string {
	return val.v.GetString("SKETCH_PATH")
}

func (val *AppConfig) GetImgDir() string {
	return val.v.GetString("IMG_DIR")
}

func (val *AppConfig) GetMaxDepth() int {
	return val.v.GetInt("MAX_DEPTH")
}

func (val *AppConfig) GetSecondsBetweenUpdates() int {
	return val.v.GetInt("SECONDS_BETWEEN_UPDATES")
}
