/*
Copyright © 2025 Codefresh Support <support@codefresh.io>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
package cmd

import (
	"fmt"
	"strings"
	"time"

	"github.com/codefresh-support/codefresh-support-package/internal/k8s"
	"github.com/codefresh-support/codefresh-support-package/internal/utils"
	"github.com/spf13/cobra"
)

var ossNamespace string

// ossCmd represents the oss command
var ossCmd = &cobra.Command{
	Use:   "oss",
	Short: "A brief description of your command",
	Long: `A longer description that spans multiple lines and likely contains examples
and usage of using your command. For example:

Cobra is a CLI library for Go that empowers applications.
This application is a tool to generate the needed files
to quickly create a Cobra application.`,
	Run: func(cmd *cobra.Command, args []string) {
		const RuntimeType = "OSS ArgoCD"
		dirPath := fmt.Sprintf("./codefresh-support-%d", time.Now().Unix())
		if ossNamespace == "" {
			var err error
			ossNamespace, err = k8s.SelectNamespace(RuntimeType)
			if err != nil {
				cmd.PrintErrln("Error selecting namespace:", err)
				return
			}
		}
		cmd.Printf("Gathering data in %s namespace for %s...\n", ossNamespace, RuntimeType)

		K8sResources := append(k8s.K8sGeneral, k8s.K8sArgo...)

		if err := utils.FetchAndSaveData(ossNamespace, K8sResources, dirPath); err != nil {
			cmd.PrintErrln("Error fetching and saving data:", err)
			return
		}

		cmd.Println("Data Gathered Successfully.")

		if err := utils.PreparePackage(strings.ReplaceAll(strings.ToLower(RuntimeType), " ", "-"), dirPath); err != nil {
			cmd.PrintErrln("Error preparing package:", err)
			return
		}
	},
}

func init() {
	rootCmd.AddCommand(ossCmd)

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// ossCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// ossCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
	ossCmd.Flags().StringVarP(&ossNamespace, "namespace", "n", "", "Specify the namespace")
}
