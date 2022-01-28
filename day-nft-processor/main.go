package main

import (
	"context"
	"fmt"
	"math/rand"
	"os/exec"
	"sync"
	"time"

	"github.com/onflow/flow-go-sdk/client"
	"google.golang.org/grpc"

	"day-nft-processor/utils"
)

func main() {
	config := utils.NewAppConfig()
	block := queryAndProcessEvents(config, 0)

	for {
		time.Sleep(time.Duration(config.GetSecondsBetweenUpdates()) * time.Second)
		block = queryAndProcessEvents(config, block)
	}

	//select {}
}

func generateImage(config *utils.AppConfig, date string, message string) {
	imgPath := config.GetImgDir() + date
	cmd := exec.Command("node", "node_p5.js", config.GetSketchPath(), date, message, imgPath)
	_, err := cmd.Output()
	if err != nil {
		fmt.Println("[ERROR]: " + err.Error())
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func queryAndProcessEvents(config *utils.AppConfig, lastBlock uint64) uint64 {
	ctx := context.Background()

	flowClient, err := client.New(config.GetAccessPoint(), grpc.WithInsecure())
	if err != nil {
		fmt.Println("[ERROR]: " + err.Error())
		return 0
	}

	block, err := flowClient.GetLatestBlock(ctx, true, grpc.EmptyCallOption{})
	if err != nil {
		fmt.Println("[ERROR]: " + err.Error())
		return 0
	}

	customType := fmt.Sprintf("A.%s.DayNFT.Minted", config.GetContractAddress())
	end := block.Height
	retries := 5
	actualDepth := min(int((block.Height-lastBlock)/249+1), config.GetMaxDepth())
	fmt.Printf("[INFO]: Starting update with depth %d", actualDepth)
	fmt.Println()
	var wg sync.WaitGroup
	for i := 1; i <= actualDepth; i++ {
		wg.Add(1)
		start := end - 249
		go func(wg *sync.WaitGroup, start uint64, end uint64) {
			defer wg.Done()
			for j := 1; j <= retries; j++ {
				time.Sleep(time.Duration(rand.Intn(500)) * time.Millisecond)
				result, err := flowClient.GetEventsForHeightRange(ctx, client.EventRangeQuery{
					Type:        customType,
					StartHeight: start,
					EndHeight:   end,
				})
				if err == nil {
					processEvents(config, result)
					break
				} else if j == retries {
					fmt.Println("[ERROR]: " + err.Error())
				}
			}
		}(&wg, start, end)
		end = start
	}
	wg.Wait()
	fmt.Println("[INFO]: Update done")
	return block.Height
}

func processEvents(config *utils.AppConfig, result []client.BlockEvents) {
	for _, block := range result {
		for _, event := range block.Events {
			date := event.Value.Fields[1].String()
			date = date[1 : len(date)-1]
			message := event.Value.Fields[2].String()
			message = message[1 : len(message)-1]
			fmt.Println("[INFO]: Generating image for date " + date)
			generateImage(config, date, message)
		}
	}
}
